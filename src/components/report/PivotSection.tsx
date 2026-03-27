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

      <div className="flex flex-col md:flex-row gap-3.5">
        {pivot.pivots.map((p, i) => {
          const isTopPick = p.rank === 'A';
          return (
            <div
              key={i}
              className={cn(
                "flex-1 border rounded-[14px] p-5 relative transition-transform hover:-translate-y-0.5",
                isTopPick
                  ? "bg-accent/5 border-accent/30"
                  : "bg-surface border-border"
              )}
            >
              <div className={cn(
                "absolute -top-2.5 left-4 font-mono text-[10px] px-2.5 py-0.5 rounded-full font-medium",
                isTopPick ? "bg-accent text-bg" : "bg-surface-3 border border-border-accent text-muted"
              )}>
                PIVOT {p.rank} {isTopPick ? '(BEST FIT)' : ''}
              </div>

              <h4 className="text-[14px] text-text font-medium mb-2 mt-1">{p.title}</h4>
              <p className="text-[12px] text-muted-2 leading-[1.5] mb-3">{p.description}</p>

              <div className="flex justify-between text-[12px] text-muted-2 pt-2 border-t border-border">
                <span>Saturation: {p.newSaturation}%</span>
                <span className={fitColors[p.executionFit] || 'text-muted'}>
                  Fit: {p.executionFit}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
