/**
 * POST /api/generate
 *
 * Validates intake data (Zod), creates a report ID, starts the pipeline
 * asynchronously, and returns the report ID immediately.
 *
 * Rate limited: 1 generation per minute per user (simple in-memory for now).
 */

import { NextRequest, NextResponse } from 'next/server';
import { intakeSchema } from '@/types/intake';
import { generateReport } from '@/lib/ai/generator';
import { reportStore, progressStore, userStore } from '@/lib/store';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // Validations
    const parsed = intakeSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid intake data', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    // Credit Check (Mock phase 5)
    const user = userStore.get('default_user');
    if (!user || user.credits < 1) {
      return NextResponse.json(
        { error: 'Insufficient credits. Please upgrade your plan.' },
        { status: 402 } 
      );
    }

    // Rate limiting
    const ip = req.headers.get('x-forwarded-for') || 'unknown';
    const now = Date.now();
    const lastGeneration = rateLimitMap.get(ip) || 0;
    if (now - lastGeneration < 60_000) {
      return NextResponse.json(
        { error: 'Rate limited. Please wait 1 minute between generations.' },
        { status: 429 } 
      );
    }
    rateLimitMap.set(ip, now);

    // Deduct credit
    userStore.set('default_user', { ...user, credits: user.credits - 1 });

    // Create report ID
    const reportId = `rpt_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

    // Initialize progress tracking
    progressStore.set(reportId, [{ step: 'queued', status: 'complete', timestamp: Date.now() }]);

    // Fire and forget — generation runs in background
    generateReport(reportId, parsed.data, (update) => {
      const progress = progressStore.get(reportId) || [];
      progress.push({ ...update, timestamp: Date.now() });
      progressStore.set(reportId, progress);
    })
      .then((report) => {
        reportStore.set(reportId, report);
      })
      .catch((err) => {
        console.error(`[API] Report ${reportId} failed:`, err);
        const progress = progressStore.get(reportId) || [];
        progress.push({ step: 'fatal', status: 'failed', timestamp: Date.now() });
        progressStore.set(reportId, progress);
      });

    return NextResponse.json({ reportId, status: 'generating' }, { status: 202 });
  } catch (err) {
    console.error('[API /generate] Unexpected error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Simple in-memory rate limit map (replace with Redis/Supabase in production)
const rateLimitMap = new Map<string, number>();
