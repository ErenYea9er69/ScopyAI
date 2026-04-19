'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';

type ConfidenceLevel = 'high' | 'medium' | 'low';

const confidenceBadge = (level: ConfidenceLevel) => {
  const map = {
    high: { label: 'High', dot: 'bg-accent-4', text: 'text-accent-4' },
    medium: { label: 'Medium', dot: 'bg-accent-5', text: 'text-accent-5' },
    low: { label: 'Low', dot: 'bg-brand-red', text: 'text-brand-red' },
  };
  const c = map[level] || map.medium;
  return (
    <span className={cn("inline-flex items-center gap-1 font-mono text-[10px]", c.text)}>
      <span className={cn("w-[5px] h-[5px] rounded-full", c.dot)} /> {c.label}
    </span>
  );
};

type LayerSectionProps = {
  id: string;
  title: string;
  icon: string;
  color: string;
  data: any;
  notFound?: string[];
  reliability?: { score: number; verdict: 'RELIABLE' | 'DIRECTIONAL' | 'SPECULATIVE' };
};

export function LayerSection({ id, title, icon, color, data, notFound, reliability }: LayerSectionProps) {
  const [expanded, setExpanded] = useState(true);
  const [showSources, setShowSources] = useState(false);

  if (!data) return null;

  const FATAL_KEYWORDS = ['IMPOSSIBLE', 'NON-VIABLE', 'KILL', 'FATAL', 'BLOCKED', 'CONTRADICTION', 'THEORETICAL ONLY'];
  const fatalItems = (notFound || []).filter(item => FATAL_KEYWORDS.some(kw => item.toUpperCase().includes(kw)));
  const regularItems = (notFound || []).filter(item => !FATAL_KEYWORDS.some(kw => item.toUpperCase().includes(kw)));

  const reliabilityConfig = {
    RELIABLE: { color: '#22c55e', bg: 'rgba(34,197,94,0.08)', border: 'rgba(34,197,94,0.25)' },
    DIRECTIONAL: { color: '#eab308', bg: 'rgba(234,179,8,0.08)', border: 'rgba(234,179,8,0.25)' },
    SPECULATIVE: { color: '#ef4444', bg: 'rgba(239,68,68,0.08)', border: 'rgba(239,68,68,0.25)' },
  };

  return (
    <div className="mb-5" id={id}>
      <div
        className="flex items-center gap-3 cursor-pointer group mb-3"
        onClick={() => setExpanded(!expanded)}
      >
        <div className={cn("w-[30px] h-[30px] rounded-lg flex items-center justify-center text-[14px] shrink-0", `bg-${color}/10`)}>
          {icon}
        </div>
        <h2 className="text-[15px] font-medium flex-1">{title}</h2>
        {reliability && (
          <span
            className="text-[10px] font-mono py-0.5 px-2 rounded-full mr-2"
            style={{
              color: reliabilityConfig[reliability.verdict].color,
              background: reliabilityConfig[reliability.verdict].bg,
              border: `1px solid ${reliabilityConfig[reliability.verdict].border}`,
            }}
          >
            {reliability.verdict} ({reliability.score}/100)
          </span>
        )}
        <button className="text-muted text-[12px] hover:text-text transition-colors">
          {expanded ? '▾ Collapse' : '▸ Expand'}
        </button>
      </div>

      {expanded && (
        <div className="bg-surface border border-border rounded-[16px] p-5 space-y-4">
          {fatalItems.length > 0 && (
            <div className="bg-red-500/5 border border-red-500/20 rounded-[10px] p-3">
              <div className="text-[11px] font-mono text-red-400 uppercase tracking-wider mb-1.5">🚫 Critical Findings</div>
              <ul className="space-y-1">
                {fatalItems.map((item, i) => (
                  <li key={i} className="text-[12px] text-red-300/90 flex items-start gap-1.5">
                    <span className="text-red-400 mt-0.5">•</span> {item}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {renderLayerContent(data, showSources)}

          <div className="flex items-center gap-3 pt-3 border-t border-border">
            <button
              onClick={() => setShowSources(!showSources)}
              className="text-[11px] font-mono text-muted hover:text-accent transition-colors"
            >
              {showSources ? 'Hide sources' : 'Show all sources'}
            </button>
          </div>

          {regularItems.length > 0 && (
            <div className="bg-surface-2 border border-border rounded-[10px] p-3 mt-3">
              <div className="text-[11px] font-mono text-muted mb-1.5">⚠ What we couldn&apos;t find:</div>
              <ul className="space-y-1">
                {regularItems.map((item, i) => (
                  <li key={i} className="text-[11px] text-muted-2 flex items-start gap-1.5">
                    <span className="text-brand-red mt-0.5">•</span> {item}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function renderLayerContent(data: any, showSources: boolean) {
  if (!data || typeof data !== 'object') return null;

  const elements: React.ReactNode[] = [];

  for (const [key, value] of Object.entries(data)) {
    if (key === 'notFound') continue;

    if (typeof value === 'number' && (key.toLowerCase().includes('margin') || key.toLowerCase().includes('score') || key.toLowerCase().includes('saturation'))) {
      elements.push(
        <div key={key} className="mb-4">
          <div className="flex justify-between items-center mb-1.5 leading-none">
            <span className="text-[11px] text-muted font-mono uppercase tracking-wider">{formatKey(key)}</span>
            <span className="text-[12px] font-bold text-text">{value}%</span>
          </div>
          <div className="w-full h-1.5 bg-surface-3 rounded-full overflow-hidden">
            <div 
              className={cn("h-full rounded-full transition-all duration-500", value > 40 ? "bg-accent" : "bg-brand-red")}
              style={{ width: `${value}%` }}
            />
          </div>
        </div>
      );
      continue;
    }

    if (typeof value === 'string' && (key.toLowerCase().includes('payback') || key.toLowerCase().includes('time') || key.toLowerCase().includes('budget'))) {
      elements.push(
        <div key={key} className="flex items-center justify-between bg-accent/5 border border-accent/20 rounded-[10px] p-3 mb-3">
          <span className="text-[11px] text-muted font-mono uppercase tracking-wider">{formatKey(key)}</span>
          <span className="text-[14px] font-bold text-accent">{value}</span>
        </div>
      );
      continue;
    }

    if (Array.isArray(value) && (key.toLowerCase().includes('flywheel') || key.toLowerCase().includes('roadmap') || key.toLowerCase().includes('phases'))) {
      elements.push(
        <div key={key} className="space-y-3 mb-4">
          <h4 className="text-[11px] text-muted font-mono uppercase tracking-wider">{formatKey(key)}</h4>
          <div className="grid grid-cols-1 gap-2">
            {value.map((step: any, i) => (
              <div key={i} className="flex gap-3 bg-surface-2 border border-border rounded-[12px] p-3">
                <div className="w-6 h-6 rounded-full bg-accent/10 border border-accent/20 flex items-center justify-center text-[11px] font-bold text-accent shrink-0 mt-0.5">
                  {i + 1}
                </div>
                <div>
                  <div className="text-[13px] font-bold text-text mb-0.5">{step.phase || step.title || step.moatFocus || "Next Step"}</div>
                  <p className="text-[12px] text-muted-2 leading-relaxed">{step.howItScales || step.description || step.content || step.action}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      );
      continue;
    }

    if (Array.isArray(value)) {
      elements.push(
        <div key={key} className="mb-4">
          <h4 className="text-[11px] text-muted font-mono uppercase tracking-wider mb-2.5">
            {formatKey(key)}
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {(value as any[]).map((item, i) => (
              <div key={i} className="bg-surface-2 border border-border rounded-[10px] p-3 px-3.5 hover:border-accent/30 transition-colors">
                {typeof item === 'string' ? (
                  <p className="text-[12px] text-muted-2 leading-[1.5]">{item}</p>
                ) : typeof item === 'object' ? (
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="w-1.5 h-1.5 rounded-full bg-accent" />
                      <div className="text-[13px] font-bold text-text leading-none">{item.title || item.type || item.userCounterStrategy || i+1}</div>
                    </div>
                    <div className="text-[12px] text-muted-2 leading-relaxed">
                      {Object.entries(item).map(([k, v]) => {
                        if (['title', 'type', 'confidence', 'sources', 'source', 'userCounterStrategy'].includes(k)) return null;
                        return (
                          <div key={k} className="mb-1 last:mb-0">
                            <span className="text-[10px] uppercase font-mono text-muted mr-1.5">{formatKey(k)}:</span>
                            <span className="text-muted-2">{String(v)}</span>
                          </div>
                        );
                      })}
                    </div>
                    {item.confidence && (
                      <div className="pt-1.5 border-t border-border/50">
                        {confidenceBadge(item.confidence as ConfidenceLevel)}
                      </div>
                    )}
                    {(item.source || item.sources) && showSources && (
                      <div className="pt-1 border-t border-border/50 mt-1">
                         {Array.isArray(item.source || item.sources) 
                           ? (item.source || item.sources).map((s: string, si: number) => <SourceLink key={si} url={s} />)
                           : <SourceLink url={item.source || item.sources} />
                         }
                      </div>
                    )}
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        </div>
      );
    } else if (typeof value === 'object' && value !== null) {
      elements.push(
        <div key={key} className="mb-4">
          <h4 className="text-[11px] text-muted font-mono uppercase tracking-wider mb-2">{formatKey(key)}</h4>
          <div className="bg-surface-2 border border-border rounded-[10px] p-3 space-y-2">
            {Object.entries(value).map(([k, v]) => {
              if (k === 'confidence') return <div key={k} className="pt-1 border-t border-border/50">{confidenceBadge(v as ConfidenceLevel)}</div>;
              if (k === 'sources' || k === 'source') {
                if (!showSources) return null;
                return <div key={k} className="pt-1 border-t border-border/50">{(v as any[]).map((s, i) => <SourceLink key={i} url={s} />)}</div>;
              }
              return (
                <div key={k} className="flex flex-col gap-0.5">
                  <span className="text-[10px] uppercase font-mono text-muted">{formatKey(k)}</span>
                  <span className="text-[12px] text-text font-medium leading-tight">{Array.isArray(v) ? v.join(', ') : String(v)}</span>
                </div>
              );
            })}
          </div>
        </div>
      );
    } else {
      elements.push(
        <div key={key} className="flex items-center justify-between mb-2">
          <span className="text-[11px] text-muted font-mono uppercase tracking-wider">{formatKey(key)}</span>
          <span className="text-[13px] text-text font-bold text-right">{String(value)}</span>
        </div>
      );
    }
  }

  return <div className="space-y-1">{elements}</div>;
}

function SourceLink({ url }: { url: string }) {
  if (!url) return null;
  return (
    <a href={url} target="_blank" rel="noreferrer"
      className="text-[10px] font-mono text-accent/70 hover:text-accent hover:underline block truncate max-w-full py-0.5">
      › {url}
    </a>
  );
}

function formatKey(key: string): string {
  return key
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, s => s.toUpperCase())
    .replace(/_/g, ' ');
}
