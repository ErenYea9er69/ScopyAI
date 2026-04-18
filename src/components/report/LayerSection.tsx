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

  // v5: Separate fatal flags from regular notFound items
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
      {/* Section Header */}
      <div
        className="flex items-center gap-3 cursor-pointer group mb-3"
        onClick={() => setExpanded(!expanded)}
      >
        <div className={cn("w-[30px] h-[30px] rounded-lg flex items-center justify-center text-[14px] shrink-0", `bg-${color}/10`)}>
          {icon}
        </div>
        <h2 className="text-[15px] font-medium flex-1">{title}</h2>
        {/* v5: Reliability badge */}
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
          {/* v5: Fatal flags promoted to TOP */}
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

          {/* Render data dynamically based on data shape */}
          {renderLayerContent(data, showSources)}

          {/* Show Sources Toggle */}
          <div className="flex items-center gap-3 pt-3 border-t border-border">
            <button
              onClick={() => setShowSources(!showSources)}
              className="text-[11px] font-mono text-muted hover:text-accent transition-colors"
            >
              {showSources ? 'Hide sources' : 'Show all sources'}
            </button>
          </div>

          {/* Not Found Transparency (non-fatal items only) */}
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

// -- Renders content in a generic fashion --
function renderLayerContent(data: any, showSources: boolean) {
  if (!data || typeof data !== 'object') return null;

  const elements: React.ReactNode[] = [];

  for (const [key, value] of Object.entries(data)) {
    if (key === 'notFound') continue;

    if (Array.isArray(value)) {
      elements.push(
        <div key={key}>
          <h4 className="text-[12px] font-mono uppercase tracking-[0.06em] text-muted mb-2.5">
            {formatKey(key)}
          </h4>
          <div className="space-y-2">
            {(value as any[]).map((item, i) => (
              <div key={i} className="bg-surface-2 border border-border rounded-[10px] p-3 px-3.5">
                {typeof item === 'string' ? (
                  <p className="text-[13px] text-muted-2 leading-[1.5]">{item}</p>
                ) : typeof item === 'object' ? (
                  <div className="space-y-1">
                    {Object.entries(item).map(([k, v]) => {
                      if (k === 'confidence' && typeof v === 'string') {
                        return <div key={k}>{confidenceBadge(v as ConfidenceLevel)}</div>;
                      }
                      if (k === 'source' || k === 'sources') {
                        if (!showSources) return null;
                        const urls = Array.isArray(v) ? v : [v];
                        return (
                          <div key={k} className="mt-1">
                            {urls.filter(Boolean).map((url, ui) => (
                              <a key={ui} href={url as string} target="_blank" rel="noreferrer"
                                className="text-[10px] font-mono text-accent-2 hover:underline block truncate max-w-[400px]">
                                {url as string}
                              </a>
                            ))}
                          </div>
                        );
                      }
                      return (
                        <div key={k} className="flex items-start gap-1.5">
                          <span className="text-[11px] text-muted font-mono shrink-0 w-[100px]">{formatKey(k)}:</span>
                          <span className="text-[12px] text-muted-2 leading-[1.4]">{String(v)}</span>
                        </div>
                      );
                    })}
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        </div>
      );
    } else if (typeof value === 'object' && value !== null) {
      elements.push(
        <div key={key}>
          <h4 className="text-[12px] font-mono uppercase tracking-[0.06em] text-muted mb-2.5">
            {formatKey(key)}
          </h4>
          <div className="bg-surface-2 border border-border rounded-[10px] p-3 px-3.5 space-y-1.5">
            {Object.entries(value).map(([k, v]) => {
              if (k === 'confidence' && typeof v === 'string') {
                return <div key={k}>{confidenceBadge(v as ConfidenceLevel)}</div>;
              }
              if (k === 'sources' && Array.isArray(v) && showSources) {
                return (
                  <div key={k}>
                    {(v as string[]).filter(Boolean).map((url, i) => (
                      <a key={i} href={url} target="_blank" rel="noreferrer"
                        className="text-[10px] font-mono text-accent-2 hover:underline block truncate max-w-[400px]">
                        {url}
                      </a>
                    ))}
                  </div>
                );
              }
              if (k === 'sources' && !showSources) return null;
              return (
                <div key={k} className="flex items-start gap-2">
                  <span className="text-[11px] text-muted font-mono shrink-0 min-w-[90px]">{formatKey(k)}:</span>
                  <span className="text-[12px] text-muted-2 leading-[1.4]">{Array.isArray(v) ? v.join(', ') : String(v)}</span>
                </div>
              );
            })}
          </div>
        </div>
      );
    } else {
      elements.push(
        <div key={key} className="flex items-start gap-2">
          <span className="text-[11px] text-muted font-mono shrink-0 min-w-[90px]">{formatKey(key)}:</span>
          <span className="text-[13px] text-muted-2 leading-[1.4]">{String(value)}</span>
        </div>
      );
    }
  }

  return <>{elements}</>;
}

function formatKey(key: string): string {
  return key
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, s => s.toUpperCase())
    .replace(/_/g, ' ');
}
