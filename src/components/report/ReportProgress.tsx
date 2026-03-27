'use client';

import { useState, useEffect, useCallback } from 'react';
import { cn } from '@/lib/utils';

type ProgressEvent = {
  step: string;
  layer?: string;
  status: string;
  timestamp: number;
};

const STEP_LABELS: Record<string, string> = {
  queued: 'Queued',
  research: 'Gathering Intelligence',
  persona: 'Classifying Persona',
  layer: 'Generating Layer',
  debate: 'Running Tri-Agent Debate',
  pivot: 'Auto-Pivot Engine',
  fatal: 'Fatal Error',
};

const LAYER_LABELS: Record<string, string> = {
  layer1: 'Audience Intelligence',
  layer2: 'Market Intelligence',
  layer3: 'Survival Intelligence',
  layer4: 'Competitor Intelligence',
  layer5: 'Unit Economics',
  layer6: 'Offer & GTM',
  layer7: 'Anti-Commoditisation',
  layer8: 'Persona-Specific',
};

export function ReportProgress({ reportId }: { reportId: string }) {
  const [progress, setProgress] = useState<ProgressEvent[]>([]);
  const [status, setStatus] = useState<'generating' | 'complete' | 'failed'>('generating');

  const poll = useCallback(async () => {
    try {
      const res = await fetch(`/api/report/${reportId}/status`);
      if (!res.ok) return;
      const data = await res.json();
      setProgress(data.progress || []);
      setStatus(data.status);
    } catch { /* ignore network errors during polling */ }
  }, [reportId]);

  useEffect(() => {
    poll();
    const interval = setInterval(poll, 2000);
    return () => clearInterval(interval);
  }, [poll]);

  // Calculate progress percentage
  const totalSteps = 12; // research + persona + 8 layers + debate + pivot
  const completedSteps = progress.filter(p => p.status === 'complete').length;
  const pct = Math.min(100, Math.round((completedSteps / totalSteps) * 100));

  if (status === 'complete') return null; // Parent handles rendering

  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="w-full max-w-[520px] bg-surface border border-border rounded-[20px] p-8 text-center">
        <div className="w-12 h-12 rounded-full bg-accent/10 flex items-center justify-center mx-auto mb-5">
          <div className="w-3 h-3 rounded-full bg-accent animate-pulse"></div>
        </div>

        <h2 className="text-[18px] font-medium mb-1">
          {status === 'failed' ? 'Report Generation Failed' : 'Generating Your Report'}
        </h2>
        <p className="text-[13px] text-muted mb-6">
          {status === 'failed'
            ? 'Something went wrong. Please try again.'
            : 'The Crucible is stress-testing your niche across 8 intelligence layers...'}
        </p>

        {/* Progress Bar */}
        <div className="h-1.5 bg-surface-3 rounded-full overflow-hidden mb-5">
          <div
            className={cn(
              "h-full rounded-full transition-all duration-700 ease-out",
              status === 'failed'
                ? "bg-brand-red"
                : "bg-gradient-to-r from-accent-2 via-accent to-accent-4"
            )}
            style={{ width: `${pct}%` }}
          />
        </div>

        {/* Step Log */}
        <div className="bg-surface-2 border border-border rounded-[12px] p-4 text-left max-h-[240px] overflow-y-auto">
          {progress.map((p, i) => {
            const label = p.layer
              ? `${STEP_LABELS[p.step] || p.step}: ${LAYER_LABELS[p.layer] || p.layer}`
              : STEP_LABELS[p.step] || p.step;

            return (
              <div key={i} className="flex items-center gap-2.5 py-1.5 text-[12px]">
                <div className={cn(
                  "w-1.5 h-1.5 rounded-full shrink-0",
                  p.status === 'complete' ? "bg-accent-4" :
                  p.status === 'failed' ? "bg-brand-red" :
                  "bg-accent animate-pulse"
                )} />
                <span className={cn(
                  p.status === 'complete' ? "text-muted-2" :
                  p.status === 'failed' ? "text-brand-red" :
                  "text-text"
                )}>
                  {label}
                </span>
                <span className="ml-auto font-mono text-[10px] text-muted">
                  {p.status === 'complete' ? '✓' : p.status === 'failed' ? '✗' : '...'}
                </span>
              </div>
            );
          })}
          {status === 'generating' && (
            <div className="flex items-center gap-2.5 py-1.5 text-[12px] text-accent animate-pulse">
              <div className="w-1.5 h-1.5 rounded-full bg-accent shrink-0" />
              Processing...
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
