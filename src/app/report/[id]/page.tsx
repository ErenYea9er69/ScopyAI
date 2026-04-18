'use client';

import { useState, useEffect, useCallback, use } from 'react';
import { useSearchParams } from 'next/navigation';
import { Navbar } from '@/components/landing/Navbar';
import { ReportProgress } from '@/components/report/ReportProgress';
import { ReportHeader } from '@/components/report/ReportHeader';
import { LayerSection } from '@/components/report/LayerSection';
import { DebateCard } from '@/components/report/DebateCard';
import { PivotSection } from '@/components/report/PivotSection';
import { RiskRadarLive } from '@/components/report/RiskRadarLive';
import { SourceBibliography } from '@/components/report/SourceBibliography';
import { ReportChat } from '@/components/report/ReportChat';
import type { FullReport } from '@/types/report';
import { cn } from '@/lib/utils';

const LAYER_CONFIG = [
  { key: 'layer1', title: 'Layer 1 — Audience Intelligence', icon: '🔥', color: 'accent-4' },
  { key: 'layer2', title: 'Layer 2 — Market Intelligence', icon: '📊', color: '[#64AAFF]' },
  { key: 'layer3', title: 'Layer 3 — Survival Intelligence', icon: '📉', color: 'brand-red' },
  { key: 'layer4', title: 'Layer 4 — Competitor Intelligence', icon: '🎯', color: 'accent-3' },
  { key: 'layer5', title: 'Layer 5 — Unit Economics', icon: '💰', color: 'accent-5' },
  { key: 'layer6', title: 'Layer 6 — Offer & GTM', icon: '🚀', color: 'accent' },
  { key: 'layer7', title: 'Layer 7 — Anti-Commoditisation', icon: '🛡️', color: 'accent-2' },
  { key: 'layer8', title: 'Layer 8 — Persona-Specific Intelligence', icon: '🎭', color: 'accent-4' },
];

export default function ReportPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const searchParams = useSearchParams();
  const isShared = searchParams.get('share') === 'true';

  const [report, setReport] = useState<FullReport | null>(null);
  const [status, setStatus] = useState<'generating' | 'complete' | 'failed'>('generating');
  const [confidenceFilter, setConfidenceFilter] = useState<'all' | 'high' | 'medium' | 'low'>('all');

  const poll = useCallback(async () => {
    try {
      const res = await fetch(`/api/report/${id}/status`);
      if (!res.ok) return;
      const data = await res.json();
      setStatus(data.status);
      if (data.report) setReport(data.report);
    } catch { /* ignore */ }
  }, [id]);

  useEffect(() => {
    poll();
    if (status === 'generating') {
      const interval = setInterval(poll, 2500);
      return () => clearInterval(interval);
    }
  }, [poll, status]);

  return (
    <>
      {!isShared && <Navbar />}
      <div className={cn("max-w-[900px] mx-auto px-7 py-10", isShared && "py-4")}>
        {/* Loading / In-Progress State */}
        {status === 'generating' && <ReportProgress reportId={id} />}

        {/* Failed State */}
        {status === 'failed' && !report && (
          <div className="text-center py-20">
            <div className="text-[40px] mb-4">💀</div>
            <h2 className="text-[20px] font-medium mb-2">Report Generation Failed</h2>
            <p className="text-[13px] text-muted mb-6">Something went wrong during analysis. Please try again.</p>
            <a href="/" className="text-[13px] font-medium py-2.5 px-6 rounded-lg border border-accent bg-accent text-bg hover:shadow-[0_4px_16px_rgba(200,242,100,0.2)] transition-shadow">
              Back to Home
            </a>
          </div>
        )}

        {/* Completed Report */}
        {report && status !== 'generating' && (
          <>
            <ReportHeader report={report} isShared={isShared} />

            {/* Confidence Filter */}
            <div className="flex items-center gap-2 mb-6 no-print">
              <span className="text-[11px] font-mono text-muted mr-1">Filter:</span>
              {(['all', 'high', 'medium', 'low'] as const).map(f => (
                <button
                  key={f}
                  onClick={() => setConfidenceFilter(f)}
                  className={`text-[11px] font-mono py-1 px-2.5 rounded-md border transition-colors ${
                    confidenceFilter === f
                      ? 'border-accent text-accent bg-accent/5'
                      : 'border-border text-muted hover:text-text'
                  }`}
                >
                  {f === 'all' ? 'All' : f.charAt(0).toUpperCase() + f.slice(1)}
                </button>
              ))}
            </div>

            {/* All 8 Layers */}
            {LAYER_CONFIG.map(lc => {
              const layerData = report.layers[lc.key as keyof typeof report.layers];
              if (!layerData) return null;
              
              // Apply confidence filter
              if (confidenceFilter !== 'all' && (layerData as any).confidenceScore?.label?.toLowerCase() !== confidenceFilter) {
                return null;
              }

              return (
                <LayerSection
                  key={lc.key}
                  id={lc.key}
                  title={lc.title}
                  icon={lc.icon}
                  color={lc.color}
                  data={layerData}
                  notFound={(layerData as any)?.notFound}
                  reliability={report.layerReliability?.[lc.key]}
                />
              );
            })}

            {/* Risk Radar */}
            <RiskRadarLive report={report} />

            {/* Tri-Agent Debate */}
            {report.debate && <DebateCard debate={report.debate} />}

            {/* Auto-Pivot */}
            {report.autoPivot && <PivotSection pivot={report.autoPivot} />}

            {/* Source Bibliography */}
            <SourceBibliography report={report} />

            {/* Print-Friendly Styles */}
            <style dangerouslySetInnerHTML={{ __html: `
              @media print {
                nav, .no-print { display: none !important; }
                body { background: white !important; color: black !important; padding: 0 !important; }
                .max-w-[900px] { max-width: 100% !important; padding: 20mm !important; }
                * { border-color: #eee !important; color-adjust: exact; -webkit-print-color-adjust: exact; }
                .bg-surface, .bg-surface-2 { background: #fcfcfc !important; }
              }
            `}} />
          </>
        )}
      </div>

      {/* Floating Chat Widget — only for authenticated viewers */}
      {report && !isShared && status === 'complete' && (
        <ReportChat reportId={id} />
      )}
    </>
  );
}
