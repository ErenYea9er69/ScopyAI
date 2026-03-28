/**
 * GET /api/report/[id]/pdf
 *
 * Generates and returns a premium PDF of the intelligence report
 * using @react-pdf/renderer (server-side rendering).
 */

import { NextRequest, NextResponse } from 'next/server';
import { renderToBuffer } from '@react-pdf/renderer';
import { reportStore, userStore } from '@/lib/store';
import { ReportPDF } from '@/lib/pdf/ReportPDF';
import React from 'react';

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
    return NextResponse.json(
      { error: 'Report is still generating. Please wait.' },
      { status: 425 }
    );
  }

  const user = userStore.get('default_user');
  const settings = user?.plan === 'Agency' ? user.settings : undefined;

  try {
    const pdfElement = React.createElement(ReportPDF, { report, settings }) as any;
    const buffer = await renderToBuffer(pdfElement);
    const uint8 = new Uint8Array(buffer);

    return new NextResponse(uint8, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="scopyai_report_${id}.pdf"`,
        'Cache-Control': 'public, max-age=3600',
      },
    });
  } catch (error) {
    console.error('[PDF API] Generation failed:', error);
    return NextResponse.json(
      { error: 'PDF generation failed' },
      { status: 500 }
    );
  }
}
