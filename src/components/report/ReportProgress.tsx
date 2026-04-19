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

// Detailed descriptions for each active step
const STEP_DESCRIPTIONS: Record<string, string> = {
  research: 'Searching Tavily, Serper, and extracting market signals from across the web…',
  persona: 'Analyzing your assets and founder-fit to determine the best intelligence modules…',
  layer1: 'Extracting pain points, buyer language, and Jobs-to-be-Done from real conversations…',
  layer2: 'Estimating TAM/SAM/SOM and evaluating market momentum signals…',
  layer3: 'Scanning for AI disruption risks, platform dependency, and regulatory blockers…',
  layer4: 'Auditing competitor pricing, moats, and identifying market gaps…',
  layer5: 'Calculating CAC, LTV, Payback Period, and AI-COGS margins…',
  layer6: 'Designing the "First 10" Playbook and phased GTM Roadmap…',
  layer7: 'Building Counter-Positioning strategies and Moat Evolution Flywheels…',
  layer8: 'Selecting the 5 highest-impact intelligence modules for your persona…',
  debate: 'The Builder, Cynic, and Operator agents are arguing about your idea…',
  pivot: 'Generating Vector-Synced pivot alternatives with asset-leverage analysis…',
};

// Thinking messages that cycle while waiting
const THINKING_MESSAGES = [
  'Cross-referencing market signals…',
  'Validating data integrity…',
  'Auditing source freshness…',
  'Running adversarial gap analysis…',
  'Synthesizing intelligence layers…',
  'Stress-testing your assumptions…',
  'Scanning for blind spots…',
  'Correlating pain point frequency…',
];

export function ReportProgress({ reportId }: { reportId: string }) {
  const [progress, setProgress] = useState<ProgressEvent[]>([]);
  const [status, setStatus] = useState<'generating' | 'complete' | 'failed'>('generating');
  const [thinkingIdx, setThinkingIdx] = useState(0);
  const [elapsed, setElapsed] = useState(0);

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

  // Cycle thinking messages
  useEffect(() => {
    const interval = setInterval(() => {
      setThinkingIdx(prev => (prev + 1) % THINKING_MESSAGES.length);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  // Elapsed timer
  useEffect(() => {
    const interval = setInterval(() => setElapsed(prev => prev + 1), 1000);
    return () => clearInterval(interval);
  }, []);

  // Calculate progress percentage
  const totalSteps = 12; // research + persona + 8 layers + debate + pivot
  const completedSteps = progress.filter(p => p.status === 'complete').length;
  const pct = Math.min(100, Math.round((completedSteps / totalSteps) * 100));

  // Determine "active" step
  const activeStep = progress.filter(p => p.status === 'started').pop();
  const activeKey = activeStep?.layer || activeStep?.step || '';
  const activeDescription = STEP_DESCRIPTIONS[activeKey] || THINKING_MESSAGES[thinkingIdx];

  const formatTime = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

  if (status === 'complete') return null;

  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="w-full max-w-[560px] bg-surface border border-border rounded-[20px] p-8 text-center">
        {/* Pulsing Orb */}
        <div className="w-14 h-14 rounded-full bg-accent/10 flex items-center justify-center mx-auto mb-5 relative">
          <div className="w-3.5 h-3.5 rounded-full bg-accent animate-pulse" />
          <div className="absolute inset-0 rounded-full bg-accent/5 animate-ping" style={{ animationDuration: '2s' }} />
        </div>

        <h2 className="text-[18px] font-medium mb-1">
          {status === 'failed' ? 'Report Generation Failed' : 'Generating Your Report'}
        </h2>
        
        {/* Active Step Description */}
        <p className="text-[13px] text-muted mb-1 min-h-[20px] transition-opacity duration-500">
          {status === 'failed'
            ? 'Something went wrong. Please try again.'
            : activeDescription}
        </p>

        {/* Timer & Completion */}
        <div className="flex items-center justify-center gap-4 mb-5">
          <span className="font-mono text-[11px] text-muted">{formatTime(elapsed)} elapsed</span>
          <span className="font-mono text-[11px] text-accent">{completedSteps}/{totalSteps} steps</span>
        </div>

        {/* Progress Bar */}
        <div className="h-2 bg-surface-3 rounded-full overflow-hidden mb-5">
          <div
            className={cn(
              "h-full rounded-full transition-all duration-700 ease-out",
              status === 'failed'
                ? "bg-brand-red"
                : "bg-gradient-to-r from-accent-2 via-accent to-accent-4"
            )}
            style={{ width: `${Math.max(pct, 3)}%` }}
          />
        </div>

        {/* Step Log */}
        <div className="bg-surface-2 border border-border rounded-[12px] p-4 text-left max-h-[300px] overflow-y-auto">
          {progress.map((p, i) => {
            const label = p.layer
              ? `${LAYER_LABELS[p.layer] || p.layer}`
              : STEP_LABELS[p.step] || p.step;

            const isActive = p.status === 'started';

            return (
              <div key={i} className={cn(
                "flex items-center gap-2.5 py-2 text-[12px] border-b border-border/30 last:border-b-0",
                isActive && "bg-accent/[0.03] -mx-2 px-2 rounded-lg"
              )}>
                <div className={cn(
                  "w-2 h-2 rounded-full shrink-0",
                  p.status === 'complete' ? "bg-accent-4" :
                  p.status === 'failed' ? "bg-brand-red" :
                  "bg-accent animate-pulse"
                )} />
                <span className={cn(
                  "flex-1",
                  p.status === 'complete' ? "text-muted-2" :
                  p.status === 'failed' ? "text-brand-red" :
                  "text-text font-medium"
                )}>
                  {label}
                </span>
                {isActive && (
                  <span className="text-[10px] text-accent font-mono animate-pulse">processing</span>
                )}
                <span className="font-mono text-[10px] text-muted">
                  {p.status === 'complete' ? '✓' : p.status === 'failed' ? '✗' : ''}
                </span>
              </div>
            );
          })}
          
          {/* Live thinking indicator */}
          {status === 'generating' && (
            <div className="flex items-center gap-2.5 py-2 text-[12px] text-accent/70 italic">
              <div className="flex gap-0.5">
                <div className="w-1 h-1 rounded-full bg-accent animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="w-1 h-1 rounded-full bg-accent animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="w-1 h-1 rounded-full bg-accent animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
              {THINKING_MESSAGES[thinkingIdx]}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
