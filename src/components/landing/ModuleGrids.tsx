import { cn } from "@/lib/utils";

type ModuleCardProps = {
  icon: string;
  badge: "Core" | "Critical" | "New" | "Upgraded" | "Financial";
  title: string;
  desc: string;
  color: "teal" | "purple" | "coral" | "amber" | "green" | "red" | "blue";
};

const ColorMap = {
  teal: {
    bg: "bg-accent-4/10",
    text: "text-accent-4",
    border: "border-accent-4/25",
    hover: "hover:border-accent-4/40",
    glow: "radial-gradient(circle at 50% 0%, rgba(74,244,184,0.06), transparent 70%)"
  },
  blue: {
    bg: "bg-[#64AAFF]/10",
    text: "text-[#64AAFF]",
    border: "border-[#64AAFF]/25",
    hover: "hover:border-[#64AAFF]/40",
    glow: "radial-gradient(circle at 50% 0%, rgba(100,170,255,0.06), transparent 70%)"
  },
  red: {
    bg: "bg-brand-red/10",
    text: "text-brand-red",
    border: "border-brand-red/30",
    hover: "hover:border-brand-red/40",
    glow: "radial-gradient(circle at 50% 0%, rgba(255,75,107,0.07), transparent 70%)"
  },
  coral: {
    bg: "bg-accent-3/10",
    text: "text-accent-3",
    border: "border-accent-3/25",
    hover: "hover:border-accent-3/40",
    glow: "radial-gradient(circle at 50% 0%, rgba(255,107,74,0.06), transparent 70%)"
  },
  amber: {
    bg: "bg-accent-5/10",
    text: "text-accent-5",
    border: "border-accent-5/25",
    hover: "hover:border-accent-5/40",
    glow: "radial-gradient(circle at 50% 0%, rgba(244,200,74,0.06), transparent 70%)"
  },
  green: {
    bg: "bg-accent/10",
    text: "text-accent",
    border: "border-accent/25",
    hover: "hover:border-accent/40",
    glow: "radial-gradient(circle at 50% 0%, rgba(200,242,100,0.06), transparent 70%)"
  },
  purple: {
    bg: "bg-accent-2/10",
    text: "text-accent-2",
    border: "border-accent-2/25",
    hover: "hover:border-accent-2/40",
    glow: "radial-gradient(circle at 50% 0%, rgba(124,111,255,0.07), transparent 70%)"
  }
};

function ModuleCard({ icon, badge, title, desc, color }: ModuleCardProps) {
  const c = ColorMap[color];
  return (
    <div 
      className={cn(
        "bg-surface border border-border rounded-[12px] p-3.5 px-4 cursor-pointer transition-all duration-150 relative overflow-hidden group hover:-translate-y-0.5",
        c.hover
      )}
    >
      <div 
        className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none"
        style={{ background: c.glow }}
      />
      <div className="flex items-start justify-between mb-2.5 relative z-10">
        <div className={cn("w-[30px] h-[30px] rounded-lg flex items-center justify-center text-[14px] shrink-0", c.bg)}>{icon}</div>
        <span className={cn("font-mono text-[10px] py-[3px] px-2 rounded-full border tracking-[0.08em]", c.text, c.border, c.bg)}>{badge}</span>
      </div>
      <h4 className="text-[13px] font-medium text-text leading-[1.3] mb-1 relative z-10">{title}</h4>
      <p className="text-[11px] text-muted leading-[1.45] relative z-10">{desc}</p>
    </div>
  );
}

export function ModuleGrids() {
  return (
    <>
      <div className="flex items-center gap-3.5 my-7">
        <div className="flex-1 h-px bg-border"></div>
        <div className="font-mono text-[10px] tracking-[0.1em] uppercase text-muted">Layer 1 — Audience Intelligence</div>
        <div className="flex-1 h-px bg-border"></div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 mb-2.5">
        <ModuleCard color="teal" icon="🔥" badge="Core" title="Pain point taxonomy" desc="Ranked by frequency, emotional intensity, and willingness-to-pay signal. Sources cited per pain point." />
        <ModuleCard color="teal" icon="💬" badge="Core" title="Verbatim buyer language" desc="Exact phrases from Reddit, reviews, and forums. Ready to paste into copy — not paraphrased." />
        <ModuleCard color="teal" icon="⚡" badge="Core" title="Purchase trigger map" desc="The specific life events or emotional states that cause someone to open their wallet. Critical for ad timing." />
        <ModuleCard color="teal" icon="🎭" badge="Core" title="Avatar — full DNA profile" desc="Age, income, platforms, identity, self-narrative, influencers they trust, and content they consume." />
        <ModuleCard color="teal" icon="🧱" badge="Core" title="Hidden objections + fears" desc="What they believe but won't say in a survey — the real reason the last 3 products failed to convert." />
        <ModuleCard color="teal" icon="👻" badge="New" title="Shadow avatar (anti-persona)" desc="Profile the customer who matches your demographics but will never buy. The lookalike who wastes your ad spend." />
      </div>
      
      <div className="flex items-center gap-3.5 my-7">
        <div className="flex-1 h-px bg-border"></div>
        <div className="font-mono text-[10px] tracking-[0.1em] uppercase text-muted">Layer 2 — Market Intelligence</div>
        <div className="flex-1 h-px bg-border"></div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 mb-2.5">
        <ModuleCard color="blue" icon="📊" badge="Core" title="TAM / SAM / SOM w/ ranges" desc="Not a single number — a range with confidence score and source citations. $2.8–5.1B (medium confidence)." />
        <ModuleCard color="blue" icon="📈" badge="Core" title="5-year trend trajectory" desc="Search volume trend, social discussion velocity, funding activity, and media coverage arc." />
        <ModuleCard color="blue" icon="🌍" badge="Core" title="International opportunity lens" desc="Same niche in other geographies — often 3–5x TAM with 60% less competition. Flags the best alternate market." />
      </div>
      
      <div className="flex items-center gap-3.5 my-7">
        <div className="flex-1 h-px bg-border"></div>
        <div className="font-mono text-[10px] tracking-[0.1em] uppercase text-muted">Layer 3 — Survival Intelligence</div>
        <div className="flex-1 h-px bg-border"></div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 mb-2.5">
        <ModuleCard color="red" icon="📉" badge="Critical" title="Dying trend detector" desc="Declining search volume, shrinking community size, commoditisation signals, and pivoting incumbents." />
        <ModuleCard color="red" icon="🤖" badge="Critical" title="AI disruption risk score" desc="Names the exact AI model threatening your niche. GPT-5 with Code Interpreter replicates 60% of your value prop." />
        <ModuleCard color="red" icon="⚠" badge="Critical" title="Platform dependency risk" desc="What percentage of the market relies on a single platform? One algorithm change risk scored 0–10." />
        <ModuleCard color="red" icon="⚖" badge="Critical" title="Legal & regulatory matrix" desc="Per-country risk breakdown: Legal in US, GDPR-complicated in EU, grey area in UK." />
      </div>
    </>
  );
}
