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

  // Simple Markdown Generator
  let md = `# MarketPulse Intelligence Report: ${report.niche}\n\n`;
  md += `**Persona:** ${report.persona}\n`;
  md += `**Generated:** ${new Date(report.generatedAt).toLocaleString()}\n\n`;
  md += `## Executive Summary\n`;
  md += `Composite Score: ${report.debate?.compositeScore || 'N/A'}/100\n\n`;

  // Layers
  Object.entries(report.layers).forEach(([key, data]: [string, any]) => {
    md += `### ${key.toUpperCase()}\n`;
    if (data.analysis) md += `${data.analysis}\n\n`;
    if (data.confidenceScore) md += `Confidence: ${data.confidenceScore.percentage}% (${data.confidenceScore.label})\n\n`;
  });

  // Sources
  md += `## Sources\n`;
  report.sources.forEach(s => {
    md += `- [${s.title}](${s.url}) [${s.confidence}]\n`;
  });

  return new NextResponse(md, {
    headers: {
      'Content-Type': 'text/markdown',
      'Content-Disposition': `attachment; filename="marketpulse_report_${id}.md"`,
    },
  });
}
