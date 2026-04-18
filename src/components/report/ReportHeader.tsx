'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import type { FullReport } from '@/types/report';

interface ReportHeaderProps {
  report: FullReport;
  isShared?: boolean;
}

const VERDICT_CONFIG = {
  GO: { emoji: '✅', color: '#22c55e', bg: 'rgba(34,197,94,0.08)', border: 'rgba(34,197,94,0.25)', label: 'GO' },
  PROCEED_WITH_CAUTION: { emoji: '⚠️', color: '#eab308', bg: 'rgba(234,179,8,0.08)', border: 'rgba(234,179,8,0.25)', label: 'PROCEED WITH CAUTION' },
  DO_NOT_PROCEED: { emoji: '🚫', color: '#ef4444', bg: 'rgba(239,68,68,0.08)', border: 'rgba(239,68,68,0.25)', label: 'DO NOT PROCEED' },
} as const;

export function ReportHeader({ report, isShared = false }: ReportHeaderProps) {
  const [copied, setCopied] = useState(false);

  const handleCopyLink = () => {
    const url = `${window.location.origin}/report/${report.id}?share=true`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const verdict = report.verdict;
  const verdictStyle = verdict ? VERDICT_CONFIG[verdict.label] : null;
  const fatalFlags = report.fatalFlags || [];
  const suppression = report.contentSuppressed;

  return (
    <div className="mb-10">
      {/* ===== V5: TOP-LEVEL VERDICT BLOCK ===== */}
      {verdict && verdictStyle && (
        <div
          className="rounded-xl p-6 mb-6 border"
          style={{ background: verdictStyle.bg, borderColor: verdictStyle.border }}
        >
          <div className="flex items-start gap-4">
            <span className="text-[36px] leading-none shrink-0">{verdictStyle.emoji}</span>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 mb-2">
                <span
                  className="font-mono text-[13px] font-bold py-1 px-3 rounded-full"
                  style={{ color: verdictStyle.color, background: `${verdictStyle.color}22`, border: `1px solid ${verdictStyle.border}` }}
                >
                  {verdictStyle.label}
                </span>
                <span className="text-[12px] font-mono text-muted">
                  Composite: {report.debate?.compositeScore || '---'}/100
                </span>
              </div>
              <p className="text-[15px] text-text leading-relaxed mb-3">{verdict.reason}</p>

              {verdict.topBlockers.length > 0 && (
                <div className="mb-3">
                  <p className="text-[11px] font-mono text-muted uppercase tracking-wider mb-1.5">Top Blockers</p>
                  <ul className="space-y-1">
                    {verdict.topBlockers.map((b, i) => (
                      <li key={i} className="text-[13px] text-text/80 flex items-start gap-2">
                        <span className="text-[10px] mt-1 shrink-0" style={{ color: verdictStyle.color }}>●</span>
                        <span className="line-clamp-2">{b}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="pt-3 border-t" style={{ borderColor: verdictStyle.border }}>
                <p className="text-[11px] font-mono text-muted uppercase tracking-wider mb-1">Recommended Action</p>
                <p className="text-[13px] font-medium" style={{ color: verdictStyle.color }}>{verdict.recommendedAction}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===== V5: FATAL FLAGS BANNER ===== */}
      {fatalFlags.length > 0 && (
        <div className="rounded-xl p-4 mb-6 border border-red-500/25 bg-red-500/5">
          <p className="text-[11px] font-mono text-red-400 uppercase tracking-wider mb-2">
            🚨 {fatalFlags.length} Fatal Flag{fatalFlags.length > 1 ? 's' : ''} Detected
          </p>
          <ul className="space-y-1.5">
            {fatalFlags.slice(0, 5).map((f, i) => (
              <li key={i} className="text-[12px] text-red-300/90 flex items-start gap-2">
                <span className="text-[10px] mt-1 shrink-0">🚫</span>
                <span className="line-clamp-2">{f}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* ===== V5: CONTENT SUPPRESSION WARNINGS ===== */}
      {suppression && (suppression.gtmPlanSuppressed || suppression.moatStrategiesSuppressed || suppression.revenueProjectionsSuppressed) && (
        <div className="rounded-xl p-4 mb-6 border border-yellow-500/25 bg-yellow-500/5">
          <p className="text-[11px] font-mono text-yellow-400 uppercase tracking-wider mb-2">
            ⚠️ Content Quality Gates Active
          </p>
          <div className="flex flex-wrap gap-2">
            {suppression.gtmPlanSuppressed && (
              <span className="text-[11px] py-1 px-2.5 rounded-full border border-yellow-500/25 bg-yellow-500/10 text-yellow-400">
                GTM Plan — Low confidence data
              </span>
            )}
            {suppression.moatStrategiesSuppressed && (
              <span className="text-[11px] py-1 px-2.5 rounded-full border border-yellow-500/25 bg-yellow-500/10 text-yellow-400">
                Moat Strategies — TAM unknown
              </span>
            )}
            {suppression.revenueProjectionsSuppressed && (
              <span className="text-[11px] py-1 px-2.5 rounded-full border border-yellow-500/25 bg-yellow-500/10 text-yellow-400">
                Revenue Projections — Operator veto
              </span>
            )}
          </div>
        </div>
      )}

      {/* ===== ORIGINAL HEADER ===== */}
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
