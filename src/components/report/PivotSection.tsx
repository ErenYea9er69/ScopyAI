import { cn } from '@/lib/utils';
import type { AutoPivotResult } from '@/types/report';

export function PivotSection({ pivot }: { pivot: AutoPivotResult }) {
  if (!pivot.triggered || pivot.pivots.length === 0) return null;

  const fitColors: Record<string, string> = {
    Easy: 'text-accent',
    Moderate: 'text-accent-5',
    Hard: 'text-accent-3',
    Impossible: 'text-brand-red',
  };

  return (
    <div className="mb-7">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-[30px] h-[30px] rounded-lg bg-accent-4/10 flex items-center justify-center text-[14px]">🔄</div>
        <div>
          <h2 className="text-[15px] font-medium">Auto-Pivot Engine</h2>
          <p className="text-[11px] text-muted">{pivot.reason}</p>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-4">
        {pivot.pivots.map((p, i) => {
          const isTopPick = p.rank === 'A';
          return (
            <div
              key={i}
              className={cn(
                "flex-1 border rounded-[20px] p-6 relative transition-all group overflow-hidden",
                isTopPick
                  ? "bg-accent/[0.03] border-accent/20 shadow-sm shadow-accent/5"
                  : "bg-surface border-border hover:border-accent/20"
              )}
            >
              {/* Background Glow */}
              {isTopPick && <div className="absolute top-0 right-0 w-32 h-32 bg-accent/5 blur-3xl -mr-16 -mt-16 rounded-full" />}

              <div className={cn(
                "absolute -top-px left-6 font-mono text-[9px] px-3 py-1 rounded-b-lg font-bold uppercase tracking-widest border-x border-b",
                isTopPick ? "bg-accent text-bg border-accent/30" : "bg-surface-3 border-border text-muted"
              )}>
                Pivot {p.rank} {isTopPick ? '(Priority)' : ''}
              </div>

              <h4 className="text-[16px] text-text font-bold mb-2 mt-4 leading-tight group-hover:text-accent transition-colors">{p.title}</h4>
              <p className="text-[12px] text-muted-2 leading-relaxed mb-4">{p.description}</p>

              {/* v5: Strategic Logic Block */}
              <div className={cn(
                "bg-surface-2 border border-border rounded-[12px] p-3 mb-4",
                isTopPick && "border-accent/10 bg-accent/[0.01]"
              )}>
                <div className="text-[10px] font-mono uppercase text-muted mb-1.5 opacity-70">Strategic Logic</div>
                <p className="text-[11px] text-muted font-medium leading-relaxed italic">
                  "{p.reasoning}"
                </p>
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-border/50">
                <div className="flex flex-col">
                  <span className="text-[10px] font-mono text-muted uppercase">Saturation</span>
                  <span className="text-[13px] font-bold text-text">{p.newSaturation}%</span>
                </div>
                <div className="flex flex-col text-right">
                  <span className="text-[10px] font-mono text-muted uppercase">Execution Fit</span>
                  <span className={cn("text-[13px] font-bold", fitColors[p.executionFit] || 'text-muted')}>
                    {p.executionFit}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
