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

        {/* Final Resolution */}
        <div className="bg-white/[0.02] border-t border-border p-4 px-5 flex items-start gap-3">
          <div className="w-1.5 h-1.5 rounded-full bg-accent-5 mt-1.5 shrink-0" />
          <div>
            <span className="text-[13px] font-medium text-text">Final Resolution: </span>
            <span className="text-[13px] text-muted-2 leading-[1.5]">{debate.finalVerdict}</span>
          </div>
          <span className="font-mono text-[14px] font-semibold text-accent ml-auto shrink-0">
            {debate.compositeScore}/100
          </span>
        </div>
      </div>
    </div>
  );
}
