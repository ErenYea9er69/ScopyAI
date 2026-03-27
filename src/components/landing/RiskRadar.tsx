export function RiskRadar() {
  return (
    <div className="bg-surface border border-border rounded-[20px] p-6 mb-7 flex flex-col md:flex-row gap-8 items-center">
      <svg className="shrink-0" width="220" height="220" viewBox="0 0 220 220">
        <g transform="translate(110,110)">
          <polygon points="0,-90 78,-45 78,45 0,90 -78,45 -78,-45" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="1"/>
          <polygon points="0,-60 52,-30 52,30 0,60 -52,30 -52,-30" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="1"/>
          <polygon points="0,-30 26,-15 26,15 0,30 -26,15 -26,-15" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="1"/>
          <line x1="0" y1="-90" x2="0" y2="90" stroke="rgba(255,255,255,0.04)" strokeWidth="1"/>
          <line x1="-78" y1="-45" x2="78" y2="45" stroke="rgba(255,255,255,0.04)" strokeWidth="1"/>
          <line x1="-78" y1="45" x2="78" y2="-45" stroke="rgba(255,255,255,0.04)" strokeWidth="1"/>
          
          <polygon points="0,-63 55,-27 47,32 0,54 -39,27 -62,-18" fill="rgba(200,242,100,0.08)" stroke="currentColor" strokeWidth="1.5" className="text-accent"/>
          
          <circle cx="0" cy="-63" r="3" className="fill-accent"/>
          <circle cx="55" cy="-27" r="3" className="fill-accent-5"/>
          <circle cx="47" cy="32" r="3" className="fill-brand-red"/>
          <circle cx="0" cy="54" r="3" className="fill-accent-4"/>
          <circle cx="-39" cy="27" r="3" className="fill-accent-2"/>
          <circle cx="-62" cy="-18" r="3" className="fill-accent-3"/>
          
          <text x="0" y="-96" textAnchor="middle" className="fill-muted text-[9px] font-mono">AI Risk</text>
          <text x="88" y="-42" textAnchor="start" className="fill-muted text-[9px] font-mono">Saturation</text>
          <text x="88" y="48" textAnchor="start" className="fill-muted text-[9px] font-mono">Platform</text>
          <text x="0" y="105" textAnchor="middle" className="fill-muted text-[9px] font-mono">Regulatory</text>
          <text x="-88" y="48" textAnchor="end" className="fill-muted text-[9px] font-mono">Decay</text>
          <text x="-88" y="-42" textAnchor="end" className="fill-muted text-[9px] font-mono">Gorilla</text>
        </g>
      </svg>
      
      <div className="flex-1">
        <h3 className="text-[15px] font-medium mb-1.5">Risk Radar — 6-axis threat visualisation</h3>
        <p className="text-[12px] text-muted leading-[1.5] mb-4">Every report generates a risk radar mapping your niche across six critical threat dimensions. Each axis is scored independently with sources so you can see exactly where danger lies.</p>
        
        <div className="grid grid-cols-2 gap-1.5">
          <div className="flex items-center gap-2 text-[12px] text-muted-2"><div className="w-2 h-2 rounded-sm bg-accent shrink-0"></div>AI disruption risk</div>
          <div className="flex items-center gap-2 text-[12px] text-muted-2"><div className="w-2 h-2 rounded-sm bg-accent-5 shrink-0"></div>Market saturation</div>
          <div className="flex items-center gap-2 text-[12px] text-muted-2"><div className="w-2 h-2 rounded-sm bg-brand-red shrink-0"></div>Platform dependency</div>
          <div className="flex items-center gap-2 text-[12px] text-muted-2"><div className="w-2 h-2 rounded-sm bg-accent-4 shrink-0"></div>Regulatory exposure</div>
          <div className="flex items-center gap-2 text-[12px] text-muted-2"><div className="w-2 h-2 rounded-sm bg-accent-2 shrink-0"></div>Trend decay rate</div>
          <div className="flex items-center gap-2 text-[12px] text-muted-2"><div className="w-2 h-2 rounded-sm bg-accent-3 shrink-0"></div>Gorilla competitor threat</div>
        </div>
      </div>
    </div>
  );
}
