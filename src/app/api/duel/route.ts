/**
 * POST /api/duel
 *
 * Accepts 2–3 niche descriptions, generates lightweight reports for each
 * in parallel, then compares them across key dimensions and declares a winner.
 *
 * Body: { niches: string[], geography: string }
 */

import { NextRequest, NextResponse } from 'next/server';
import { generateStructuredOutput, MODELS } from '@/lib/ai/client';
import { gatherIntelligence } from '@/lib/research/orchestrator';
import { userStore } from '@/lib/store';
import { z } from 'zod';

const duelInputSchema = z.object({
  niches: z.array(z.string().min(5)).min(2).max(3),
  geography: z.string().min(1),
});

const nicheScoreSchema = z.object({
  niche: z.string(),
  scores: z.object({
    marketSize: z.number().min(0).max(100),
    competition: z.number().min(0).max(100),
    timing: z.number().min(0).max(100),
    moatPotential: z.number().min(0).max(100),
    executionEase: z.number().min(0).max(100),
    revenueSpeed: z.number().min(0).max(100),
  }),
  composite: z.number().min(0).max(100),
  verdict: z.string(),
  strengths: z.array(z.string()),
  weaknesses: z.array(z.string()),
});

const duelResultSchema = z.object({
  contestants: z.array(nicheScoreSchema),
  winner: z.string(),
  reasoning: z.string(),
  dimensionWinners: z.array(z.object({
    dimension: z.string(),
    winner: z.string(),
    reason: z.string(),
  })),
});

export type DuelResult = z.infer<typeof duelResultSchema>;

// In-memory store for duel results
const duelStore = new Map<string, { status: string; result?: DuelResult }>();

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = duelInputSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    // Credit Check (Mock phase 5) - Duel costs 2 credits
    const user = userStore.get('default_user');
    if (!user || user.credits < 2) {
      return NextResponse.json(
        { error: 'Insufficient credits. Niche duels cost 2 credits.' },
        { status: 402 } 
      );
    }

    const { niches, geography } = parsed.data;
    const duelId = `duel_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    
    // Deduct 2 credits
    userStore.set('default_user', { ...user, credits: user.credits - 2 });

    // Store initial status
    duelStore.set(duelId, { status: 'researching' });

    // Fire and forget — run async
    runDuel(duelId, niches, geography).catch(err => {
      console.error('[Duel] Fatal error:', err);
      duelStore.set(duelId, { status: 'failed' });
    });

    return NextResponse.json({ duelId, status: 'researching' }, { status: 202 });
  } catch (err) {
    console.error('[Duel API]', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

async function runDuel(duelId: string, niches: string[], geography: string) {
  // Step 1: Research all niches in parallel
  console.log(`[Duel] Researching ${niches.length} niches...`);

  const intakes = niches.map(niche => ({
    niche,
    geography,
    stage: '',
    budget: '',
    timeCommitment: '',
    assets: [] as string[],
    competitorUrls: [] as string[],
    complaintPlatforms: [] as string[],
    founderFit: [] as string[],
    goalTimeline: '',
    uniqueInsight: '',
    acquisitionChannel: '',
    buyerType: '',
    revenueModel: '',
    whyNow: '',
  }));

  const researchResults = await Promise.allSettled(
    intakes.map(intake => gatherIntelligence(intake))
  );

  duelStore.set(duelId, { status: 'comparing' });

  // Step 2: Build comparison context
  const researchContext = niches.map((niche, i) => {
    const res = researchResults[i];
    if (res.status === 'rejected') return `Niche "${niche}": Research failed.`;

    const data = res.value;
    return `
=== NICHE: "${niche}" ===
Market Data: ${data.marketSize.slice(0, 3).join(' | ')}
Competitors: ${data.competitors.slice(0, 3).join(' | ')}
Pain Points: ${data.painPoints.slice(0, 3).join(' | ')}
Trends: ${data.trends.slice(0, 2).join(' | ')}
Sources: ${data.sources.length} citations
`.trim();
  }).join('\n\n');

  // Step 3: LLM comparison
  console.log('[Duel] Running comparison analysis...');

  const systemPrompt = `You are the ScopyAI Niche Duel Engine — a market intelligence comparison system.

You are given research data for ${niches.length} niches. Score each niche across 6 dimensions (0-100):
1. **Market Size** — TAM potential, growth trajectory
2. **Competition** — Lower = more competitive. Higher = more white space.
3. **Timing** — Market readiness, trend momentum
4. **Moat Potential** — Defensibility, network effects, switching costs
5. **Execution Ease** — How easy to launch as a solo founder
6. **Revenue Speed** — Time to first dollar

Calculate a weighted composite score:
- Market Size: 20%
- Competition: 15%
- Timing: 15%
- Moat Potential: 20%
- Execution Ease: 15%
- Revenue Speed: 15%

Declare an overall winner with reasoning.
For each dimension, name which niche wins and why.
List 2-3 specific strengths and weaknesses per niche.
OUTPUT FORMAT: Valid JSON exactly matching this structure (no markdown wrappers):
{
  "contestants": [
    {
      "niche": "string",
      "scores": {
        "marketSize": 0,
        "competition": 0,
        "timing": 0,
        "moatPotential": 0,
        "executionEase": 0,
        "revenueSpeed": 0
      },
      "composite": 0,
      "verdict": "string",
      "strengths": ["string"],
      "weaknesses": ["string"]
    }
  ],
  "winner": "string",
  "reasoning": "string",
  "dimensionWinners": [
    {
      "dimension": "string",
      "winner": "string",
      "reason": "string"
    }
  ]
}`;

  const userPrompt = `GEOGRAPHY: ${geography}

${researchContext}

Compare these niches head-to-head and produce a full duel analysis.`;

  const result = await generateStructuredOutput(
    systemPrompt,
    userPrompt,
    duelResultSchema,
    MODELS.REASONING
  );

  duelStore.set(duelId, { status: 'complete', result });
  console.log(`[Duel] Complete. Winner: ${result.winner}`);
}

// GET endpoint to poll duel status
export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const duelId = url.searchParams.get('id');

  if (!duelId) {
    return NextResponse.json({ error: 'Missing duel ID' }, { status: 400 });
  }

  const duel = duelStore.get(duelId);
  if (!duel) {
    return NextResponse.json({ error: 'Duel not found' }, { status: 404 });
  }

  return NextResponse.json(duel);
}
