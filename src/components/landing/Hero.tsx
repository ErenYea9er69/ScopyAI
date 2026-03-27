'use client';

import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';

export function Hero() {
  const [phase, setPhase] = useState(1);
  const [survivalScore, setSurvivalScore] = useState(100);

  useEffect(() => {
    // Simple mock of the crucible simulation looping
    const interval = setInterval(() => {
      setPhase((p) => {
        if (p === 1) return 2;
        if (p === 2) {
          setSurvivalScore(Math.floor(Math.random() * (95 - 40 + 1)) + 40);
          return 3;
        }
        setSurvivalScore(100);
        return 1;
      });
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="pt-20 pb-15 text-center">
      <div className="font-mono text-[11px] tracking-[0.12em] text-accent uppercase mb-5">
        The Anti-Fragile Idea Crucible
      </div>
      
      <h1 className="font-serif text-[clamp(40px,6vw,70px)] leading-[1.08] text-text mb-[18px] italic transition-opacity duration-500">
        The AI that tries to kill your idea<br />
        <span className="text-accent not-italic">before you build it</span>
      </h1>
      
      <p className="text-[16px] text-muted-2 max-w-[560px] mx-auto mb-10 leading-[1.7]">
        We don't just "generate ideas." We run them through an adversarial survival engine, kill the weak ones, pivot the saturated ones, and only output blueprints that survive the Crucible.
      </p>
      
      {/* CRUCIBLE DASHBOARD MOCK */}
      <div className="bg-surface border border-border rounded-[20px] p-6 mx-auto max-w-[600px] text-left relative shadow-[0_10px_40px_-10px_rgba(0,0,0,0.5)] overflow-hidden">
        <div className="flex items-center justify-between mb-5">
          <div className="text-[14px] font-medium flex items-center gap-2 font-sans">
            <div className="w-2 h-2 rounded-full bg-accent-3 animate-[pulse_1s_infinite]"></div> 
            <span>Adversarial Survival Engine</span>
          </div>
          <div className="font-mono text-[11px] border border-accent/30 text-accent py-1 px-2.5 rounded-full">
            PHASE {phase}
          </div>
        </div>
        
        <div className="relative min-h-[160px]">
          {/* Phase 1 */}
          <div className={cn("absolute inset-0 transition-opacity duration-500", phase === 1 ? "opacity-100 z-10" : "opacity-0 z-0")}>
            <div className="font-mono text-[11px] text-muted-2 bg-black/30 border border-border-accent rounded-[12px] p-4 h-[160px] overflow-hidden flex flex-col gap-1.5 shadow-[inset_0_2px_10px_rgba(0,0,0,0.2)]">
               <div className="flex items-start gap-2.5">
                 <span className="text-accent-2 text-[10px] opacity-60 w-[34px] shrink-0 mt-px">00:00</span>
                 <span className="leading-[1.4] text-accent">Crucible ready. Waiting for niche input...</span>
               </div>
            </div>
          </div>
          
          {/* Phase 2 Mock */}
          <div className={cn("absolute inset-0 transition-opacity duration-500 bg-black/40 border border-border-accent rounded-[12px] flex items-center justify-center overflow-hidden", phase === 2 ? "opacity-100 z-10" : "opacity-0 z-0")}>
             <div className="text-accent-3 font-mono text-sm animate-pulse">Running Predator Sonar...</div>
          </div>
          
          {/* Phase 3 Mock */}
          <div className={cn("absolute inset-0 transition-opacity duration-500 bg-black/40 border border-border-accent rounded-[12px] flex items-center justify-center", phase === 3 ? "opacity-100 z-10" : "opacity-0 z-0")}>
             <div className="text-accent-5 font-mono text-sm">Stress testing unit economics...</div>
          </div>
        </div>
        
        <div className="mt-5 pt-4 border-t border-border flex items-center gap-5">
          <div className="font-mono text-[10px] uppercase text-muted tracking-[0.05em] w-[140px]">Crucible Confidence Score</div>
          <div className="flex-1 h-2 bg-surface-2 rounded-full overflow-hidden border border-border relative">
            <div 
              className="absolute left-0 top-0 bottom-0 bg-gradient-to-r from-brand-red via-accent-5 to-accent transition-all duration-1000 origin-left"
              style={{ width: `${survivalScore}%` }}
            ></div>
          </div>
          <div className="font-mono text-[14px] font-semibold text-accent w-[40px] text-right">{survivalScore}%</div>
        </div>
      </div>
    </div>
  );
}
