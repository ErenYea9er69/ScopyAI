/**
 * GET /api/report/[id]/json
 *
 * Returns the full structured report data as downloadable JSON.
 */

import { NextRequest, NextResponse } from 'next/server';
import { reportStore } from '@/lib/store';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const report = reportStore.get(id);

  if (!report) {
    return NextResponse.json({ error: 'Report not found' }, { status: 404 });
  }

  if (report.status !== 'complete') {
    return NextResponse.json({ error: 'Report not yet complete' }, { status: 202 });
  }

  return new NextResponse(JSON.stringify(report, null, 2), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Content-Disposition': `attachment; filename="scopyai-report-${id}.json"`,
    },
  });
}
