import { NextRequest, NextResponse } from 'next/server';
import { reportStore } from '@/lib/store';

export async function GET() {
  const reports = Array.from(reportStore.values()).map(r => ({
    id: r.id,
    niche: r.niche,
    persona: r.persona,
    status: r.status,
    generatedAt: r.generatedAt,
    compositeScore: r.debate?.compositeScore,
  }));

  // Sort by newest first
  reports.sort((a, b) => new Date(b.generatedAt).getTime() - new Date(a.generatedAt).getTime());

  return NextResponse.json({ reports });
}
