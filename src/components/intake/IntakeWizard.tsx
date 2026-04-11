'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import { useRouter } from 'next/navigation';

export function IntakeWizard() {
  const [step, setStep] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  
  // Basic form state
  const [form, setForm] = useState({
    niche: '', geo: '', stage: '', keywords: '',
    budget: '', time: '', timeline: '', assets: [] as string[],
    urls: '', sources: [] as string[],
    fit: [] as string[],
    _hp: '' // Honeypot field — bots fill this, humans never see it
  });

  // Calculate confidence score (simple mock logic)
  let filledFields = 0;
  if (form.niche.length > 5) filledFields++;
  if (form.geo) filledFields++;
  if (form.stage) filledFields++;
  if (form.budget) filledFields++;
  if (form.time) filledFields++;
  if (form.urls.length > 5) filledFields++;
  
  const totalCore = 6;
  const progressPercent = Math.min(100, Math.max(8, (filledFields / totalCore) * 100));

  const toggleArray = (field: 'assets' | 'sources' | 'fit', value: string) => {
    setForm(prev => {
      const arr = prev[field];
      return { ...prev, [field]: arr.includes(value) ? arr.filter(v => v !== value) : [...arr, value] };
    });
  };

  const [isGenerating, setIsGenerating] = useState(false);

  const handleNext = async () => {
    if (step < 2) {
      setStep(step + 1);
      return;
    }

    // Honeypot check — silently reject bots
    if (form._hp) {
      console.warn('[IntakeWizard] Bot detected via honeypot.');
      return;
    }

    try {
      setIsGenerating(true);
      setError(null);
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          niche: form.niche,
          geography: form.geo,
          stage: form.stage,
          budget: form.budget,
          timeCommitment: form.time,
          assets: form.assets,
          competitorUrls: form.urls.split(',').map(u => u.trim()).filter(Boolean),
          complaintPlatforms: form.sources,
          founderFit: form.fit,
          goalTimeline: form.timeline,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (res.status === 402) {
          throw new Error('You have completely run out of credits. Please upgrade your plan or refill credits in the dashboard to generate more reports.');
        }
        throw new Error(data.error || 'Failed to start generation');
      }
      
      router.push(`/report/${data.reportId}`);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to start generation. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <>
      <div className="bg-surface border border-border rounded-[20px] overflow-hidden mb-7">
        <div className="p-5 px-6 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="font-mono text-[10px] py-[3px] px-2 rounded-full border border-accent/25 bg-accent/5 text-accent tracking-[0.08em]">Input</span>
            <div>
              <h3 className="text-[14px] font-medium text-text">Tell us about your market</h3>
              <p className="text-[12px] text-muted mt-0.5">The more context, the sharper your report</p>
            </div>
          </div>
          <span className="font-mono text-[11px] text-muted">{filledFields} / {totalCore} core fields</span>
        </div>
        
        <div className="flex items-center p-4 px-6 border-b border-border overflow-x-auto whitespace-nowrap">
          <div className={cn("flex items-center gap-2 cursor-pointer py-1.5 px-3.5 rounded-lg transition-all", step === 0 ? "bg-accent/10 text-text" : "text-muted hover:text-muted-2")} onClick={() => setStep(0)}>
            <div className={cn("w-[22px] h-[22px] rounded-full border-[1.5px] flex items-center justify-center font-mono text-[10px] shrink-0 transition-all", step === 0 || step > 0 ? "border-accent text-accent" : "border-muted text-muted", step > 0 && "bg-accent text-bg")}>1</div>
            <span className="text-[12px]">Niche</span>
          </div>
          <div className="w-6 h-px bg-border shrink-0"></div>
          
          <div className={cn("flex items-center gap-2 cursor-pointer py-1.5 px-3.5 rounded-lg transition-all", step === 1 ? "bg-accent/10 text-text" : "text-muted hover:text-muted-2")} onClick={() => setStep(1)}>
            <div className={cn("w-[22px] h-[22px] rounded-full border-[1.5px] flex items-center justify-center font-mono text-[10px] shrink-0 transition-all", step === 1 || step > 1 ? "border-accent text-accent" : "border-muted text-muted", step > 1 && "bg-accent text-bg")}>2</div>
            <span className="text-[12px]">You</span>
          </div>
          <div className="w-6 h-px bg-border shrink-0"></div>
          
          <div className={cn("flex items-center gap-2 cursor-pointer py-1.5 px-3.5 rounded-lg transition-all", step === 2 ? "bg-accent/10 text-text" : "text-muted hover:text-muted-2")} onClick={() => setStep(2)}>
            <div className={cn("w-[22px] h-[22px] rounded-full border-[1.5px] flex items-center justify-center font-mono text-[10px] shrink-0 transition-all", step === 2 ? "border-accent text-accent" : "border-muted text-muted")}>3</div>
            <span className="text-[12px]">Competitors</span>
          </div>
        </div>

        {/* Honeypot — visually hidden, traps bots */}
        <div aria-hidden="true" style={{ position: 'absolute', left: '-9999px', top: '-9999px', opacity: 0, height: 0, overflow: 'hidden' }}>
          <label htmlFor="_hp_field">Leave this empty</label>
          <input id="_hp_field" type="text" name="website" autoComplete="off" tabIndex={-1} value={form._hp} onChange={e => setForm({...form, _hp: e.target.value})} />
        </div>

        {/* Form Body */}
        <div className="p-5 px-6 pb-6">
          {step === 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-[14px]">
              <div className="flex flex-col gap-1.5 md:col-span-2">
                <label className="text-[12px] font-medium text-muted-2 tracking-[0.03em] flex items-center gap-1.5">Niche description <span className="text-brand-red">*</span> <span className="font-normal text-muted text-[11px] font-mono">— be specific</span></label>
                <textarea 
                  className="bg-surface-2 border border-border-accent rounded-[12px] p-2.5 px-3.5 text-text font-sans text-[14px] outline-none w-full min-h-[80px] focus:border-accent/40 focus:bg-surface-3 transition-colors" 
                  placeholder='e.g. "AI tools for freelance copywriters who want to charge more without working more hours"'
                  value={form.niche} onChange={e => setForm({...form, niche: e.target.value})}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[12px] font-medium text-muted-2 tracking-[0.03em] flex items-center gap-1.5">Primary geography <span className="text-brand-red">*</span></label>
                <select className="bg-surface-2 border border-border-accent rounded-[12px] p-2.5 px-3.5 text-text text-[14px] outline-none w-full focus:border-accent/40 focus:bg-surface-3 cursor-pointer appearance-none" value={form.geo} onChange={e => setForm({...form, geo: e.target.value})}>
                  <option value="">Select market…</option>
                  <option>United States</option>
                  <option>United Kingdom</option>
                  <option>Global (English-speaking)</option>
                </select>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[12px] font-medium text-muted-2 tracking-[0.03em] flex items-center gap-1.5">Business stage <span className="text-brand-red">*</span></label>
                <select className="bg-surface-2 border border-border-accent rounded-[12px] p-2.5 px-3.5 text-text text-[14px] outline-none w-full focus:border-accent/40 focus:bg-surface-3 cursor-pointer appearance-none" value={form.stage} onChange={e => setForm({...form, stage: e.target.value})}>
                  <option value="">Select stage…</option>
                  <option>Idea validation (pre-revenue)</option>
                  <option>MVP built, no customers</option>
                  <option>Early revenue (&lt;$5k/mo)</option>
                </select>
              </div>
            </div>
          )}

          {step === 1 && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-[14px]">
              <div className="flex flex-col gap-1.5">
                <label className="text-[12px] font-medium text-muted-2 tracking-[0.03em]">Available budget</label>
                <select className="bg-surface-2 border border-border-accent rounded-[12px] p-2.5 px-3.5 text-text text-[14px] outline-none w-full focus:border-accent/40 focus:bg-surface-3 cursor-pointer appearance-none" value={form.budget} onChange={e => setForm({...form, budget: e.target.value})}>
                  <option value="">Select budget...</option>
                  <option>Under $500</option>
                  <option>$500–$2k</option>
                  <option>$2k–$10k</option>
                </select>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[12px] font-medium text-muted-2 tracking-[0.03em]">Time commitment</label>
                <select className="bg-surface-2 border border-border-accent rounded-[12px] p-2.5 px-3.5 text-text text-[14px] outline-none w-full focus:border-accent/40 focus:bg-surface-3 cursor-pointer appearance-none" value={form.time} onChange={e => setForm({...form, time: e.target.value})}>
                  <option value="">Select time...</option>
                  <option>Side project (&lt;10h/week)</option>
                  <option>Part-time (10–25h/week)</option>
                </select>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[12px] font-medium text-muted-2 tracking-[0.03em]">Goal timeline</label>
                <select className="bg-surface-2 border border-border-accent rounded-[12px] p-2.5 px-3.5 text-text text-[14px] outline-none w-full focus:border-accent/40 focus:bg-surface-3 cursor-pointer appearance-none" value={form.timeline} onChange={e => setForm({...form, timeline: e.target.value})}>
                  <option value="">Select timeline...</option>
                  <option>Revenue in 30 days</option>
                  <option>Revenue in 90 days</option>
                </select>
              </div>
              <div className="flex flex-col gap-1.5 md:col-span-3">
                <label className="text-[12px] font-medium text-muted-2 tracking-[0.03em] flex items-center gap-1.5">Existing assets <span className="font-normal text-muted text-[11px] font-mono">— select all that apply</span></label>
                <div className="flex flex-wrap gap-[7px]">
                  {["Audience / community", "Domain expertise", "Email list", "Industry network"].map(opt => (
                    <span 
                      key={opt} onClick={() => toggleArray('assets', opt)}
                      className={cn("bg-surface-2 border border-border-accent rounded-lg py-1.5 px-3 text-[13px] text-muted-2 cursor-pointer transition-all select-none hover:border-border-accent hover:text-text", form.assets.includes(opt) && "bg-accent/10 border-accent/40 text-accent")}
                    >
                      {opt}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-[14px]">
              <div className="flex flex-col gap-1.5 md:col-span-2">
                <label className="text-[12px] font-medium text-muted-2 tracking-[0.03em] flex items-center gap-1.5">Known competitor URLs <span className="font-normal text-muted text-[11px] font-mono">— up to 3</span></label>
                <input type="text" className="bg-surface-2 border border-border-accent rounded-[12px] p-2.5 px-3.5 text-text text-[14px] outline-none w-full focus:border-accent/40 focus:bg-surface-3" placeholder="e.g. competitor1.com, competitor2.io" value={form.urls} onChange={e => setForm({...form, urls: e.target.value})} />
              </div>
              <div className="flex flex-col gap-1.5 md:col-span-2 mt-2">
                <label className="text-[12px] font-medium text-muted-2 tracking-[0.03em] flex items-center gap-1.5">Where does your audience complain?</label>
                <div className="flex flex-wrap gap-[7px]">
                  {["Reddit", "G2 Reviews", "Trustpilot", "X / Twitter", "Facebook Groups"].map(opt => (
                    <span 
                      key={opt} onClick={() => toggleArray('sources', opt)}
                      className={cn("bg-surface-2 border border-border-accent rounded-lg py-1.5 px-3 text-[13px] text-muted-2 cursor-pointer transition-all select-none hover:border-border-accent hover:text-text", form.sources.includes(opt) && "bg-accent/10 border-accent/40 text-accent")}
                    >
                      {opt}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Error Display */}
        {error && step === 2 && (
          <div className="mx-6 mb-4 p-4 rounded-xl bg-brand-red/10 border border-brand-red/20 flex flex-col items-center justify-center text-center animate-in fade-in slide-in-from-top-2">
            <span className="text-[24px] mb-2">💳</span>
            <p className="text-[13px] text-brand-red font-medium leading-relaxed max-w-[400px]">
              {error}
            </p>
          </div>
        )}

        {/* Wizard Nav */}
        <div className="flex justify-between p-4 px-6 border-t border-border">
          <button 
            className={cn("font-sans text-[13px] font-medium py-2 px-5 rounded-lg border border-border-accent bg-surface-2 text-muted-2 transition-colors hover:text-text hover:border-accent", step === 0 && "invisible")}
            onClick={() => setStep(step - 1)}
          >
            ← Back
          </button>
          <button 
            disabled={isGenerating}
            className={cn(
              "font-sans text-[13px] font-medium py-2 px-5 rounded-lg border border-accent bg-accent text-bg transition-shadow hover:shadow-[0_4px_16px_rgba(200,242,100,0.2)]",
              isGenerating && "opacity-50 cursor-not-allowed"
            )}
            onClick={handleNext}
          >
            {step === 2 
              ? isGenerating ? "Generating..." : "Generate Report" 
              : "Next →"}
          </button>
        </div>
      </div>

      {/* Founder Fit Grid */}
      <div className="bg-surface border border-accent/10 rounded-[20px] p-6 mb-7 transition-colors hover:border-accent/20">
        <div className="flex items-center gap-2.5 mb-4.5">
          <div className="w-[34px] h-[34px] rounded-[10px] bg-accent/10 flex items-center justify-center text-[16px] shrink-0">🎯</div>
          <div>
            <h3 className="text-[14px] font-medium">Founder–market fit pre-check</h3>
            <p className="text-[12px] text-muted mt-0.5">The engine weights opportunity scores based on your answers.</p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {[
            "I have personally experienced the pain point this niche addresses",
            "I can name at least 5 people in this target audience I could call today",
            "I have domain expertise that reduces my research / production costs",
            "I can reach the first 50 customers without paid acquisition"
          ].map(statement => {
            const isChecked = form.fit.includes(statement);
            return (
              <div key={statement} className={cn("flex items-center gap-2.5 bg-surface-2 border border-border rounded-[12px] p-3 px-3.5 cursor-pointer transition-colors hover:border-border-accent", isChecked && "border-accent/50")} onClick={() => toggleArray('fit', statement)}>
                <div className={cn("w-4 h-4 rounded-[4px] border-[1.5px] border-muted shrink-0 flex items-center justify-center text-[10px] text-bg transition-colors", isChecked && "bg-accent border-accent")}>
                  {isChecked && "✓"}
                </div>
                <p className={cn("text-[12px] leading-[1.4] transition-colors", isChecked ? "text-text" : "text-muted-2")}>{statement}</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Confidence Bar */}
      <div className="bg-surface-2 border border-border rounded-[12px] p-3.5 px-4 mt-3.5 mb-7">
        <div className="text-[12px] text-muted-2 mb-2.5 font-medium">Report quality signal — fill in more context for better output</div>
        <div className="h-1.5 bg-surface-3 rounded-[3px] overflow-hidden mb-2">
          <div 
            className="h-full rounded-[3px] bg-gradient-to-r from-brand-red via-accent-5 to-accent transition-all duration-400 ease-out"
            style={{ width: `${progressPercent}%` }}
          ></div>
        </div>
        <div className="text-[11px] text-muted font-mono">
          {filledFields < totalCore ? "Start by describing your niche above to unlock the full intelligence engine." : "High confidence signal achieved. Ready to generate."}
        </div>
      </div>
    </>
  );
}
