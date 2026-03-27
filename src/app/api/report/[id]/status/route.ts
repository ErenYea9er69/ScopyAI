/**
 * GET /api/report/[id]/status
 *
 * Returns the current progress events and report status for a given report ID.
 * In a full implementation this would be SSE (Server-Sent Events) for real-time
 * streaming, but for Phase 2 we use polling.
 */

import { NextRequest, NextResponse } from 'next/server';
import { reportStore, progressStore } from '@/lib/store';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const progress = progressStore.get(id);
  const report = reportStore.get(id);

  if (!progress) {
    return NextResponse.json({ error: 'Report not found' }, { status: 404 });
  }

  // Determine high-level status
  let status: 'generating' | 'complete' | 'failed' = 'generating';
  if (report) {
    status = report.status === 'complete' ? 'complete' : 'failed';
  }

  // Check if any fatal event happened
  const hasFatal = progress.some((p) => p.step === 'fatal' && p.status === 'failed');
  if (hasFatal) status = 'failed';

  return NextResponse.json({
    reportId: id,
    status,
    progress,
    report: status === 'complete' ? report : undefined,
  });
}
