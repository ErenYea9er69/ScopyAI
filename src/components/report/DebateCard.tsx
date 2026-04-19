import { cn } from '@/lib/utils';
import type { DebateResult } from '@/types/report';

export function DebateCard({ debate }: { debate: DebateResult }) {
  const agents = [
    {
      name: 'Builder Agent',
      role: 'Opportunity',
      data: debate.builder,
      color: 'accent',
      dotColor: 'bg-accent',
      borderColor: 'border-accent/30',
    },
    {
      name: 'Cynic Agent',
      role: 'Risk',
      data: debate.cynic,
      color: 'brand-red',
      dotColor: 'bg-brand-red',
      borderColor: 'border-brand-red/30',
    },
    {
      name: 'Operator Agent',
      role: 'Execution',
      data: debate.operator,
      color: 'accent-2',
      dotColor: 'bg-accent-2',
      borderColor: 'border-accent-2/30',
    },
  ];

  return (
    <div className="mb-7">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-[30px] h-[30px] rounded-lg bg-brand-red/10 flex items-center justify-center text-[14px]">⚔️</div>
        <h2 className="text-[15px] font-medium">Tri-Agent Debate Scorecard</h2>
      </div>

      <div className="bg-surface border border-border rounded-[16px] overflow-hidden">
        <div className="p-5 space-y-3">
          {agents.map((agent) => (
            <div key={agent.name} className="flex items-start gap-3 py-3 border-b border-border last:border-b-0">
              <div className={cn("w-1.5 h-1.5 rounded-full shrink-0 mt-1.5", agent.dotColor)} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <span className="text-[13px] font-medium text-text">{agent.name}</span>
                  <span className={cn(
                    "font-mono text-[10px] py-0.5 px-1.5 rounded border",
                    agent.data.signal === 'GO' || agent.data.signal === 'EASY' || agent.data.signal === 'CAUTION'
                      ? 'text-accent border-accent/30'
                      : agent.data.signal === 'KILL' || agent.data.signal === 'IMPOSSIBLE'
                        ? 'text-brand-red border-brand-red/30'
                        : 'text-accent-5 border-accent-5/30'
                  )}>
                    {agent.data.signal}
                  </span>
                </div>
                <p className="text-[12px] text-muted-2 leading-[1.5] mb-2">{agent.data.reasoning}</p>
                <div className="flex flex-wrap gap-1.5">
                  {agent.data.keyPoints.map((point, i) => (
                    <span key={i} className="text-[10px] bg-surface-2 border border-border rounded-md py-0.5 px-2 text-muted">
                      {point}
                    </span>
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <div className="w-[60px] h-1 bg-surface-3 rounded-full overflow-hidden hidden sm:block">
                  <div className={cn("h-full rounded-full", agent.dotColor)} style={{ width: `${agent.data.score}%` }} />
                </div>
                <span className="font-mono text-[12px] text-text font-medium w-[40px] text-right">
                  {agent.data.score}
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* v5: The Investor Duel (Clash Points) */}
        {debate.clashPoints && debate.clashPoints.length > 0 && (
          <div className="bg-brand-red/[0.03] border-t border-brand-red/10 p-5">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-[11px] font-mono text-brand-red uppercase tracking-wider">⚡ The Investor Duel</span>
            </div>
            <div className="space-y-2">
              {debate.clashPoints.map((point, i) => (
                <div key={i} className="flex gap-3 items-start">
                  <div className="w-5 h-5 rounded bg-brand-red/10 border border-brand-red/20 flex items-center justify-center text-[10px] shrink-0 mt-0.5">VS</div>
                  <p className="text-[13px] text-brand-red/90 leading-relaxed font-medium">{point}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* v5: Execution Roadmap (Milestones) */}
        {debate.milestones && debate.milestones.length > 0 && (
          <div className="bg-accent/[0.03] border-t border-accent/10 p-5">
            <div className="flex items-center gap-2 mb-4">
              <span className="text-[11px] font-mono text-accent uppercase tracking-wider">🗺️ Execution Roadmap</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {debate.milestones.map((ms, i) => {
                const isKill = ms.condition.toUpperCase().includes('KILL');
                const isPivot = ms.condition.toUpperCase().includes('PIVOT');
                const colorClass = isKill ? "text-brand-red border-brand-red/20 bg-brand-red/5" : isPivot ? "text-accent-5 border-accent-5/20 bg-accent-5/5" : "text-accent border-accent/20 bg-accent/5";
                
                return (
                  <div key={i} className={cn("border rounded-[12px] p-3", colorClass)}>
                    <div className="text-[10px] font-mono uppercase opacity-70 mb-1">{ms.condition}</div>
                    <div className="text-[12px] font-bold leading-snug">{ms.action}</div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Final Resolution */}
        <div className="bg-white/[0.02] border-t border-border p-5 flex items-start justify-between gap-5">
          <div className="flex items-start gap-3">
            <div className="w-1.5 h-1.5 rounded-full bg-accent-5 mt-1.5 shrink-0" />
            <div>
              <span className="text-[13px] font-bold text-text">Resolution Verdict: </span>
              <p className="text-[13px] text-muted-2 leading-relaxed mt-1">{debate.finalVerdict}</p>
            </div>
          </div>
          <div className="text-right shrink-0">
            <div className="text-[10px] font-mono text-muted uppercase tracking-tighter mb-0.5">Composite Score</div>
            <div className="font-mono text-[24px] font-bold text-accent leading-none">
              {debate.compositeScore}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
