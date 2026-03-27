'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import type { FullReport } from '@/types/report';

interface ReportHeaderProps {
  report: FullReport;
  isShared?: boolean;
}

export function ReportHeader({ report, isShared = false }: ReportHeaderProps) {
  const [copied, setCopied] = useState(false);

  const handleCopyLink = () => {
    const url = `${window.location.origin}/report/${report.id}?share=true`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="mb-10">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-border">
        <div>
          <div className="flex items-center gap-2.5 mb-3">
            <span className="font-mono text-[10px] py-[3px] px-2 rounded-full border border-accent/25 bg-accent/5 text-accent uppercase tracking-wider">
              {report.status} Intelligence Report
            </span>
            <span className="font-mono text-[10px] py-[3px] px-2 rounded-full border border-border bg-surface-2 text-muted uppercase tracking-wider">
              ID: {report.id}
            </span>
          </div>
          <h1 className="text-[28px] font-medium text-text leading-tight mb-2">
            {report.niche}
          </h1>
          <p className="text-[14px] text-muted max-w-[600px]">
            Deep analysis generated for the <span className="text-text font-medium">{report.persona}</span> archetype. 
            Cross-referenced across {report.sources.length} intelligence signals.
          </p>
        </div>

        {!isShared && (
          <div className="flex items-center gap-2 no-print shrink-0">
            <button
              onClick={handleCopyLink}
              className={cn(
                "text-[12px] font-medium py-2 px-4 rounded-lg border transition-all",
                copied 
                  ? "border-green-500/50 bg-green-500/10 text-green-500" 
                  : "border-border-accent bg-surface-2 text-muted-2 hover:text-text hover:border-accent"
              )}
            >
              {copied ? '✓ Link Copied' : 'Share Report'}
            </button>
            
            <div className="w-px h-8 bg-border mx-1" />

            <a
              href={`/api/report/${report.id}/markdown`}
              download
              className="text-[12px] font-medium py-2 px-4 rounded-lg border border-border-accent bg-surface-2 text-muted-2 hover:text-text hover:border-accent transition-colors"
            >
              Markdown
            </a>
            
            <a
              href={`/api/report/${report.id}/json`}
              download
              className="text-[12px] font-medium py-2 px-4 rounded-lg border border-border-accent bg-surface-2 text-muted-2 hover:text-text hover:border-accent transition-colors"
            >
              JSON
            </a>

            <a
              href={`/api/report/${report.id}/pdf`}
              download
              className="text-[12px] font-medium py-2 px-5 rounded-lg border border-accent bg-accent text-bg hover:shadow-[0_4px_16px_rgba(200,242,100,0.2)] transition-shadow"
            >
              Export PDF
            </a>
          </div>
        )}

        {isShared && (
          <div className="no-print">
            <a 
              href="/"
              className="text-[12px] font-medium py-2 px-5 rounded-lg border border-accent text-accent hover:bg-accent/5 transition-colors"
            >
              Build Your Own Report →
            </a>
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
        <div className="bg-surface-2 border border-border rounded-xl p-4">
          <p className="text-[11px] font-mono text-muted uppercase tracking-wider mb-1">Archetype</p>
          <p className="text-[15px] font-medium capitalize">{report.persona}</p>
        </div>
        <div className="bg-surface-2 border border-border rounded-xl p-4">
          <p className="text-[11px] font-mono text-muted uppercase tracking-wider mb-1">Intel Signals</p>
          <p className="text-[15px] font-medium">{report.sources.length} Citations</p>
        </div>
        <div className="bg-surface-2 border border-border rounded-xl p-4">
          <p className="text-[11px] font-mono text-muted uppercase tracking-wider mb-1">Composite Score</p>
          <p className="text-[15px] font-medium transition-colors" style={{ color: `var(--color-accent)` }}>
            {report.debate?.compositeScore || '---'}/100
          </p>
        </div>
        <div className="bg-surface-2 border border-border rounded-xl p-4">
          <p className="text-[11px] font-mono text-muted uppercase tracking-wider mb-1">Generated</p>
          <p className="text-[13px] font-medium">{new Date(report.generatedAt).toLocaleDateString()}</p>
        </div>
      </div>
    </div>
  );
}
