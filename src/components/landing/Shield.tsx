export function Shield() {
  return (
    <div className="bg-surface border border-accent-2/20 rounded-[20px] p-6 mb-7 relative overflow-hidden transition-all duration-500 hover:border-accent-2/40">
      {/* Decorative Glow */}
      <div className="absolute -top-10 -right-10 w-[180px] h-[180px] bg-[radial-gradient(circle,rgba(124,111,255,0.08),transparent_70%)] pointer-events-none"></div>
      
      <div className="flex flex-col md:flex-row items-start md:items-center gap-2.5 mb-4">
        <div className="w-[34px] h-[34px] rounded-[10px] bg-accent-2/10 flex items-center justify-center text-[16px] shrink-0">🛡️</div>
        <div>
          <h3 className="text-[14px] font-medium text-text">Hallucination Shield — every claim is verified</h3>
          <p className="text-[12px] text-muted mt-0.5">
            77% of businesses have made decisions based on hallucinated AI content (<a href="https://www.salesforce.com/news/stories/ai-trust-research/" target="_blank" className="text-accent-2 text-[12px] hover:underline" rel="noreferrer">Salesforce, 2024</a>). MarketPulse eliminates that risk.
          </p>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
        <div className="bg-surface-2 border border-border rounded-[12px] p-3 md:p-[14px]">
          <div className="w-5 h-5 rounded-full bg-accent-4/10 flex items-center justify-center text-[10px] mb-2 text-accent-4">✓</div>
          <h5 className="text-[12px] font-medium text-text mb-[3px]">Source citations on every claim</h5>
          <p className="text-[11px] text-muted leading-[1.4]">TAM figures, competitor revenue estimates, and trend data are tied to a retrievable source — not confabulated.</p>
        </div>
        
        <div className="bg-surface-2 border border-border rounded-[12px] p-3 md:p-[14px]">
          <div className="w-5 h-5 rounded-full bg-accent-4/10 flex items-center justify-center text-[10px] mb-2 text-accent-4">✓</div>
          <h5 className="text-[12px] font-medium text-text mb-[3px]">Confidence intervals, not false precision</h5>
          <p className="text-[11px] text-muted leading-[1.4]">Instead of "TAM: $4.2B", you get "TAM: $2.8–5.1B (medium confidence, 2 sources)". Uncertainty is visible.</p>
        </div>
        
        <div className="bg-surface-2 border border-border rounded-[12px] p-3 md:p-[14px]">
          <div className="w-5 h-5 rounded-full bg-accent-4/10 flex items-center justify-center text-[10px] mb-2 text-accent-4">✓</div>
          <h5 className="text-[12px] font-medium text-text mb-[3px]">Conflict flags when sources disagree</h5>
          <p className="text-[11px] text-muted leading-[1.4]">If two sources give different growth rates, the report flags the conflict rather than silently averaging.</p>
        </div>
      </div>
    </div>
  );
}
