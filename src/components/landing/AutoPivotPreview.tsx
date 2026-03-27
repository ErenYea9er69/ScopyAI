import { cn } from "@/lib/utils";

export function AutoPivotPreview() {
  return (
    <div className="bg-gradient-to-b from-surface to-transparent border border-border rounded-[20px] p-8 md:p-6 mb-7 text-center">
      <div className="mb-6">
        <span className="font-mono text-[10px] py-[3px] px-2 rounded-full border border-accent-4/30 bg-accent-4/10 text-accent-4 tracking-[0.08em] mb-3 inline-block">Crucible Feature</span>
        <h3 className="text-[16px] font-medium mb-2">The Auto-Pivot Engine (3 ranked options)</h3>
        <p className="text-[13px] text-muted mb-6">Generic ideas die fast. If your market is too crowded, the Crucible generates three ranked pivot strategies — each with a feasibility check against YOUR skills and budget from Step 2.</p>
      </div>
      
      <div className="flex flex-col md:flex-row items-center justify-center gap-5 mt-5">
        
        {/* Dead idea */}
        <div className="flex-1 max-w-[320px] bg-surface-2 border border-brand-red/30 rounded-[12px] p-5 relative text-left w-full">
          <div className="absolute -top-2.5 left-5 font-mono text-[10px] px-2.5 py-0.5 rounded-full bg-brand-red text-bg">DEAD IDEA</div>
          <h4 className="text-[14px] text-text mb-3 font-medium">B2B SaaS for generic SEO blog writing</h4>
          <p className="text-[12px] text-muted-2 leading-[1.5]">You entered this niche, but it failed the Crucible. It has 94% saturation, zero defensibility against GPT-5, and CAC is $1,200.</p>
          <div className="flex justify-between text-[12px] text-muted-2 mt-1.5 pt-1.5 border-t border-border">
            <span>Saturation: 94%</span>
            <span>Diff: Hard</span>
          </div>
        </div>
        
        <div className="text-[20px] text-muted hidden md:block">→</div>
        <div className="text-[20px] text-muted md:hidden">↓</div>
        
        {/* Pivot A */}
        <div className="flex-1 max-w-[320px] bg-accent/5 border border-accent/30 rounded-[12px] p-5 relative text-left w-full hover:shadow-[0_4px_16px_rgba(200,242,100,0.05)] transition-shadow">
          <div className="absolute -top-2.5 left-5 font-mono text-[10px] px-2.5 py-0.5 rounded-full bg-accent text-bg">PIVOT A (BEST FIT)</div>
          <h4 className="text-[14px] text-text mb-3 font-medium">AI programmatic SEO for Shopify niche stores</h4>
          <p className="text-[12px] text-muted-2 leading-[1.5]">Leverages your marketing background. 60% less competition, high willingness to pay since it maps directly to ROAS.</p>
          <div className="flex justify-between text-[12px] text-muted-2 mt-1.5 pt-1.5 border-t border-border">
            <span>Saturation: 32%</span>
            <span className="text-accent">Diff: Easy</span>
          </div>
        </div>
        
        {/* Pivot B */}
        <div className="flex-1 max-w-[320px] bg-surface-2 border border-border-accent rounded-[12px] p-5 relative text-left w-full">
          <div className="absolute -top-2.5 left-5 font-mono text-[10px] px-2.5 py-0.5 rounded-full bg-surface-3 border border-border-accent text-muted">PIVOT B</div>
          <h4 className="text-[14px] text-text mb-3 font-medium">Internal knowledge base AI for law firms</h4>
          <p className="text-[12px] text-muted-2 leading-[1.5]">Massive pain point, low saturation. But you lack legal network, making first 10 sales extremely difficult.</p>
          <div className="flex justify-between text-[12px] text-muted-2 mt-1.5 pt-1.5 border-t border-border">
            <span>Saturation: 14%</span>
            <span className="text-brand-red">Diff: Impossible</span>
          </div>
        </div>
        
      </div>
      
      <button className="bg-surface-3 border border-border-accent text-text py-2 px-4 rounded-full text-[12px] cursor-pointer transition-colors mt-6 hover:border-accent hover:text-accent">
        Run Pivot Scenario Engine
      </button>
    </div>
  );
}
