'use client';

import { useState, useEffect } from 'react';
import { Navbar } from '@/components/landing/Navbar';
import { cn } from '@/lib/utils';
import type { DuelResult } from '@/app/api/duel/route';

export default function NicheDuelPage() {
  const [niches, setNiches] = useState<string[]>(['', '']);
  const [geography, setGeography] = useState('');
  const [duelId, setDuelId] = useState<string | null>(null);
  const [status, setStatus] = useState<'idle' | 'researching' | 'comparing' | 'complete' | 'failed'>('idle');
  const [result, setResult] = useState<DuelResult | null>(null);

  const addNiche = () => {
    if (niches.length < 3) setNiches([...niches, '']);
  };

  const removeNiche = (index: number) => {
    if (niches.length > 2) {
      setNiches(niches.filter((_, i) => i !== index));
    }
  };

  const updateNiche = (index: number, value: string) => {
    const newNiches = [...niches];
    newNiches[index] = value;
    setNiches(newNiches);
  };

  const startDuel = async () => {
    const validNiches = niches.filter(n => n.trim().length > 3);
    if (validNiches.length < 2 || !geography.trim()) return;

    setStatus('researching');
    setResult(null);

    try {
      const res = await fetch('/api/duel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ niches: validNiches, geography }),
      });

      if (!res.ok) throw new Error('Failed to start duel');

      const data = await res.json();
      setDuelId(data.duelId);
    } catch (err) {
      console.error(err);
      setStatus('failed');
    }
  };

  useEffect(() => {
    if (!duelId || status === 'complete' || status === 'failed') return;

    const poll = async () => {
      try {
        const res = await fetch(`/api/duel?id=${duelId}`);
        if (!res.ok) return;

        const data = await res.json();
        setStatus(data.status);
        if (data.result) setResult(data.result);
      } catch (err) {
        console.error(err);
      }
    };

    const interval = setInterval(poll, 3000);
    return () => clearInterval(interval);
  }, [duelId, status]);

  const DIMENSIONS = [
    { key: 'marketSize', label: 'Market Size' },
    { key: 'competition', label: 'Competition (White Space)' },
    { key: 'timing', label: 'Timing & Trend' },
    { key: 'moatPotential', label: 'Moat Potential' },
    { key: 'executionEase', label: 'Execution Ease' },
    { key: 'revenueSpeed', label: 'Speed to Revenue' }
  ];

  return (
    <>
      <Navbar />
      <div className="max-w-[1200px] mx-auto px-7 py-12">
        <div className="mb-10 text-center">
          <span className="font-mono text-[10px] py-[3px] px-2 rounded-full border border-accent/25 bg-accent/5 text-accent uppercase tracking-wider mb-4 inline-block">
            Pro Feature
          </span>
          <h1 className="text-[32px] md:text-[40px] font-medium leading-tight mb-4">
            Niche Duel Engine
          </h1>
          <p className="text-muted max-w-[600px] mx-auto text-[14px]">
            Input up to 3 niches. We'll run parallel intelligence gathering and pit them against each other across 6 dimensions to find the definitive winner.
          </p>
        </div>

        {status === 'idle' && (
          <div className="max-w-[600px] mx-auto bg-surface-2 border border-border rounded-2xl p-6 md:p-8">
            <h2 className="text-[14px] font-medium mb-4">Enter Contenders</h2>
            
            <div className="space-y-4 mb-6">
              {niches.map((niche, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-surface border border-border flex items-center justify-center text-[12px] text-muted font-mono shrink-0">
                    {i + 1}
                  </div>
                  <input
                    type="text"
                    value={niche}
                    onChange={(e) => updateNiche(i, e.target.value)}
                    placeholder={i === 0 ? "e.g. AI CRM for Plumbers" : i === 1 ? "e.g. Scheduling SaaS for Dentists" : "Optional 3rd niche"}
                    className="flex-1 bg-surface border border-border-accent rounded-xl py-3 px-4 text-[14px] outline-none focus:border-accent/50 transition-colors"
                  />
                  {niches.length > 2 && (
                    <button 
                      onClick={() => removeNiche(i)}
                      className="w-10 h-10 rounded-xl bg-surface border border-border flex items-center justify-center text-muted hover:text-red-400 hover:bg-red-400/10 transition-colors"
                    >
                      ✕
                    </button>
                  )}
                </div>
              ))}
            </div>

            {niches.length < 3 && (
              <button 
                onClick={addNiche}
                className="text-[13px] text-accent border border-accent/30 bg-accent/5 py-2 px-4 rounded-lg mb-6 hover:bg-accent/10 transition-colors w-full border-dashed"
              >
                + Add 3rd Contender
              </button>
            )}

            <div className="mb-8">
              <label className="block text-[12px] text-muted mb-2">Target Geography</label>
              <input
                type="text"
                value={geography}
                onChange={(e) => setGeography(e.target.value)}
                placeholder="e.g. United States, Global, UK"
                className="w-full bg-surface border border-border-accent rounded-xl py-3 px-4 text-[14px] outline-none focus:border-accent/50 transition-colors"
              />
            </div>

            <button
              onClick={startDuel}
              disabled={niches.filter(n => n.length > 3).length < 2 || !geography.trim()}
              className="w-full py-3.5 rounded-xl bg-accent text-bg font-medium text-[14px] hover:shadow-[0_4px_20px_rgba(200,242,100,0.25)] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              FIGHT! (Start Duel)
            </button>
          </div>
        )}

        {/* Loading States */}
        {(status === 'researching' || status === 'comparing') && (
          <div className="max-w-[600px] mx-auto text-center py-20">
            <div className="w-16 h-16 rounded-full border-2 border-accent/20 border-t-accent animate-spin mx-auto mb-6"></div>
            <h2 className="text-[20px] font-medium text-text mb-2">
              {status === 'researching' ? 'Gathering Intelligence...' : 'Running Head-to-Head Comparison...'}
            </h2>
            <p className="text-[14px] text-muted">
              {status === 'researching' 
                ? 'Scraping market sizing, competitors, and trends in parallel.' 
                : 'Scoring niches across 6 viability dimensions.'}
            </p>
          </div>
        )}

        {/* Failed */}
        {status === 'failed' && (
          <div className="text-center py-20">
            <div className="text-[40px] mb-4">💀</div>
            <h2 className="text-[20px] font-medium mb-2">Duel Failed</h2>
            <p className="text-[13px] text-muted mb-6">The intelligence gathering encountered an error.</p>
            <button onClick={() => setStatus('idle')} className="text-[13px] font-medium py-2 px-6 rounded-lg border border-border bg-surface-2 hover:bg-surface-3">
              Try Again
            </button>
          </div>
        )}

        {/* Complete */}
        {status === 'complete' && result && (
          <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Winner Banner */}
            <div className="bg-gradient-to-br from-[#1A2E0E] to-[#0D1507] border border-accent/30 rounded-2xl p-8 md:p-12 text-center relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-accent to-transparent"></div>
              <span className="font-mono text-[12px] text-accent mb-4 block uppercase tracking-[0.2em]">Definitive Winner</span>
              <h2 className="text-[32px] md:text-[48px] font-medium text-white mb-6">
                {result.winner}
              </h2>
              <p className="text-[15px] text-white/80 max-w-[800px] mx-auto leading-relaxed px-4">
                {result.reasoning}
              </p>
            </div>

            {/* Score Grid Cards */}
            <div className={`grid gap-6 ${result.contestants.length === 3 ? 'md:grid-cols-3' : 'md:grid-cols-2 max-w-[900px] mx-auto'}`}>
              {result.contestants.map((contender, i) => (
                <div 
                  key={i} 
                  className={cn(
                    "rounded-2xl border p-6 flex flex-col relative overflow-hidden",
                    contender.niche === result.winner ? "bg-accent/5 border-accent" : "bg-surface-2 border-border"
                  )}
                >
                  {contender.niche === result.winner && (
                    <div className="absolute top-4 right-4 bg-accent text-bg text-[10px] font-bold px-2 py-1 rounded-sm uppercase">WINNER</div>
                  )}
                  
                  <h3 className="text-[20px] font-medium mb-4 pr-16">{contender.niche}</h3>
                  
                  <div className="flex items-center gap-4 mb-6 pb-6 border-b border-border/50">
                    <div>
                      <span className="block text-[10px] text-muted font-mono uppercase mb-1">Composite</span>
                      <span className={cn("text-[32px] font-medium line-height-none", contender.niche === result.winner ? "text-accent" : "text-white")}>
                        {contender.composite}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-4 mb-8 flex-1">
                    {DIMENSIONS.map(dim => {
                      const score = contender.scores[dim.key as keyof typeof contender.scores];
                      return (
                        <div key={dim.key}>
                          <div className="flex justify-between text-[11px] mb-1.5">
                            <span className="text-muted-2">{dim.label}</span>
                            <span className="font-mono">{score}/100</span>
                          </div>
                          <div className="h-1.5 bg-surface rounded-full overflow-hidden">
                            <div 
                              className={cn("h-full rounded-full transition-all duration-1000", contender.niche === result.winner ? "bg-accent/80" : "bg-border-accent")} 
                              style={{ width: `${score}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="space-y-4 text-[12px]">
                    <div>
                      <span className="text-green-400 font-medium block mb-2">Strengths</span>
                      <ul className="space-y-1.5 list-disc pl-4 text-muted-2">
                        {contender.strengths.map((s, idx) => <li key={idx}>{s}</li>)}
                      </ul>
                    </div>
                    <div>
                      <span className="text-red-400 font-medium block mb-2">Weaknesses</span>
                      <ul className="space-y-1.5 list-disc pl-4 text-muted-2">
                        {contender.weaknesses.map((w, idx) => <li key={idx}>{w}</li>)}
                      </ul>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Dimension Breakdown List */}
            <div className="bg-surface-2 border border-border rounded-xl p-6">
              <h3 className="text-[16px] font-medium mb-6">Dimension Breakdowns</h3>
              <div className="space-y-6">
                {result.dimensionWinners.map((dw, i) => (
                  <div key={i} className="flex flex-col md:flex-row gap-4 pb-6 border-b border-border/50 last:border-0 last:pb-0">
                    <div className="md:w-1/4">
                      <span className="text-[12px] font-mono text-muted uppercase block mb-1">{dw.dimension}</span>
                      <span className="text-[14px] font-medium text-accent">{dw.winner}</span>
                    </div>
                    <div className="md:w-3/4">
                      <p className="text-[13px] text-muted-2 leading-relaxed">{dw.reason}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="text-center pt-8">
               <button onClick={() => { setStatus('idle'); setNiches(['', '']); setDuelId(null); }} className="text-[13px] font-medium py-3 px-8 rounded-xl border border-border bg-surface-2 hover:bg-surface-3 transition-colors">
                 Start New Duel
               </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
