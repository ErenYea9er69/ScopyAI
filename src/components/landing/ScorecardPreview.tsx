import { cn } from "@/lib/utils";

type ScoreRowProps = {
  indicator: string;
  name: React.ReactNode;
  score: number;
  label: string;
};

function ScoreRow({ indicator, name, score, label }: ScoreRowProps) {
  return (
    <div className="flex items-center gap-3 py-2.5 border-b border-border last:border-b-0 last:pb-0">
      <div className={cn("w-1.5 h-1.5 rounded-full shrink-0", indicator)}></div>
      <div className="flex-1 text-[13px] text-muted-2">{name}</div>
      <div className="w-[80px] h-1 bg-surface-3 rounded-sm overflow-hidden hidden sm:block">
        <div className={cn("h-full rounded-sm", indicator.replace('bg-', 'bg-').split(' ')[0])} style={{ width: `${score}%` }}></div>
      </div>
      <div className="font-mono text-[12px] text-text font-medium text-right min-w-[120px]">{label}</div>
    </div>
  );
}

export function ScorecardPreview() {
  return (
    <div className="bg-surface border border-border rounded-[20px] overflow-hidden mb-7">
      <div className="p-5 px-6 border-b border-border">
        <span className="font-mono text-[10px] py-[3px] px-2 rounded-full border border-brand-red/30 bg-brand-red/10 text-brand-red tracking-[0.08em] mb-3 inline-block">Adversarial Scoring</span>
        <h3 className="text-[15px] font-medium leading-[1.3]">Tri-Agent Debate Scorecard</h3>
        <p className="text-[12px] text-muted mt-[3px] leading-[1.45]">Your idea's viability is debated by three independent AI agents: The Builder (opportunity), The Cynic (risk), and The Operator (execution feasibility). You see the raw conflict and the final resolution.</p>
      </div>
      
      <div className="p-5 px-6 flex flex-col gap-1">
        <div className="flex items-center gap-3 py-2.5 border-b border-border">
          <div className="w-1.5 h-1.5 rounded-full shrink-0 bg-accent"></div>
          <div className="flex-1 text-[13px] text-muted-2">
            <strong>Builder Agent:</strong> High demand, clear pain points.
            <span className="font-mono text-[10px] text-accent border border-accent/30 py-0.5 px-1.5 rounded ml-1.5 inline-block">GO</span>
          </div>
          <div className="w-[80px] h-1 bg-surface-3 rounded-sm overflow-hidden hidden sm:block"><div className="h-full rounded-sm bg-accent w-[85%]"></div></div>
          <div className="font-mono text-[12px] text-text font-medium text-right min-w-[80px]">85 / 100</div>
        </div>
        
        <div className="flex items-center gap-3 py-2.5 border-b border-border">
          <div className="w-1.5 h-1.5 rounded-full shrink-0 bg-brand-red"></div>
          <div className="flex-1 text-[13px] text-muted-2">
            <strong>Cynic Agent:</strong> No moat, easily cloned by OpenAI.
            <span className="font-mono text-[10px] text-brand-red border border-brand-red/30 py-0.5 px-1.5 rounded ml-1.5 inline-block">KILL</span>
          </div>
          <div className="w-[80px] h-1 bg-surface-3 rounded-sm overflow-hidden hidden sm:block"><div className="h-full rounded-sm bg-brand-red w-[90%]"></div></div>
          <div className="font-mono text-[12px] text-text font-medium text-right min-w-[80px]">90 / 100 (Risk)</div>
        </div>
        
        <div className="flex items-center gap-3 py-2.5 border-b border-border">
          <div className="w-1.5 h-1.5 rounded-full shrink-0 bg-accent-2"></div>
          <div className="flex-1 text-[13px] text-muted-2">
            <strong>Operator Agent:</strong> At your budget ($5k), you can't build the iOS app this requires. Execution probability: 12%.
            <span className="font-mono text-[10px] text-accent-2 border border-accent-2/30 py-0.5 px-1.5 rounded ml-1.5 inline-block">HARD</span>
          </div>
          <div className="w-[80px] h-1 bg-surface-3 rounded-sm overflow-hidden hidden sm:block"><div className="h-full rounded-sm bg-accent-2 w-[72%]"></div></div>
          <div className="font-mono text-[12px] text-text font-medium text-right min-w-[80px]">72 / 100 (Difficulty)</div>
        </div>
        
        <div className="bg-white/[0.02] p-3.5 rounded-lg my-2.5 flex items-start gap-3">
          <div className="w-1.5 h-1.5 rounded-full shrink-0 bg-accent-5 mt-1.5"></div>
          <div className="text-[13px] leading-[1.5]">
            <strong className="text-text">Final Resolution: </strong>
            <span className="text-muted-2">GO if you secure exclusive data rights. PIVOT if you can't raise $50k. KILL if neither condition is met within 90 days.</span>
          </div>
        </div>
        
        <ScoreRow indicator="bg-accent-5" name="Entry barrier (for you specifically)" score={55} label="Easy / Moderate / Hard" />
        <ScoreRow indicator="bg-accent" name="Monetisation potential" score={80} label="$ to $$$$$ + LTV" />
        <ScoreRow indicator="bg-accent-5" name="Trend health" score={65} label="Growing / Stable / Fading" />
        <ScoreRow indicator="bg-accent-2" name="Unit economics viability" score={50} label="LTV:CAC verdict" />
        <ScoreRow indicator="bg-accent" name="Founder–market fit score" score={100} label="0 / 6" />
        <ScoreRow indicator="bg-accent-5" name="Platform dependency risk" score={45} label="Score 0–10" />
        <ScoreRow indicator="bg-accent" name="Time to first revenue" score={60} label="Days / Weeks / Months" />
      </div>
    </div>
  );
}
