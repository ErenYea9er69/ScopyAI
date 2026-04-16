'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import { useRouter } from 'next/navigation';

const GEOGRAPHIES = [
  // Major Markets
  "United States", "United Kingdom", "Canada", "Australia", "Germany",
  "France", "Japan", "South Korea", "India", "Brazil",
  "Mexico", "Spain", "Italy", "Netherlands", "Sweden",
  "Switzerland", "Singapore", "UAE", "Saudi Arabia",
  // Emerging Markets
  "Nigeria", "South Africa", "Kenya", "Egypt", "Tunisia",
  "Morocco", "Turkey", "Indonesia", "Philippines", "Vietnam",
  "Thailand", "Malaysia", "Poland", "Czech Republic", "Romania",
  "Colombia", "Argentina", "Chile",
  // Regions
  "Global (English-speaking)", "European Union", "MENA Region",
  "Southeast Asia", "Latin America", "Sub-Saharan Africa",
  "East Asia", "South Asia", "Oceania",
];

const BUDGETS = [
  "Bootstrapped (€0 — sweat equity only)",
  "Under $500",
  "$500–$2k",
  "$2k–$10k",
  "$10k–$50k",
  "$50k+",
];

const TIME_OPTIONS = [
  "Side project (<10h/week)",
  "Part-time (10–25h/week)",
  "Full-time (40h+/week)",
];

const STAGES = [
  "Just exploring / researching",
  "Idea validation (pre-revenue)",
  "MVP built, no customers",
  "Early revenue (<$5k/mo)",
  "Scaling ($5k–$50k/mo)",
  "Established ($50k+/mo)",
  "Pivoting from existing business",
];

const TIMELINES = [
  "Revenue in 30 days",
  "Revenue in 90 days",
  "Revenue in 6 months",
  "Revenue in 12 months",
  "Just exploring / no deadline",
];

const ASSETS = [
  "Audience / community",
  "Domain expertise",
  "Email list",
  "Industry network",
  "Technical skills",
  "Existing product",
  "Patent / IP",
  "Social media following",
];

const COMPLAINT_PLATFORMS = [
  "Reddit", "G2 Reviews", "Trustpilot", "X / Twitter",
  "Facebook Groups", "Yelp", "LinkedIn", "Quora",
  "HackerNews", "Product Hunt", "App Store Reviews",
];

const FOUNDER_FIT_STATEMENTS = [
  "I have personally experienced the pain point this niche addresses",
  "I can name at least 5 people in this target audience I could call today",
  "I have domain expertise that reduces my research / production costs",
  "I can reach the first 50 customers without paid acquisition",
  "I have a technical advantage (can build the product myself)",
  "I've worked in this industry professionally for 2+ years",
];

export function ProIntakeWizard() {
  const [step, setStep] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [geoFilter, setGeoFilter] = useState('');
  const router = useRouter();

  const [form, setForm] = useState({
    niche: '', geo: '', stage: '', keywords: '',
    budget: '', time: '', timeline: '', assets: [] as string[],
    urls: '', sources: [] as string[],
    fit: [] as string[],
    uniqueInsight: '',
    acquisitionChannel: '',
    buyerType: '',
    revenueModel: '',
    whyNow: '',
    _hp: '',
  });

  let filledFields = 0;
  if (form.niche.length > 5) filledFields++;
  if (form.geo) filledFields++;
  if (form.stage) filledFields++;
  if (form.budget) filledFields++;
  if (form.time) filledFields++;
  if (form.urls.length > 5) filledFields++;
  if (form.uniqueInsight.length > 10) filledFields++;

  const totalCore = 7;
  const progressPercent = Math.min(100, Math.max(8, (filledFields / totalCore) * 100));

  const toggleArray = (field: 'assets' | 'sources' | 'fit', value: string) => {
    setForm(prev => {
      const arr = prev[field];
      return { ...prev, [field]: arr.includes(value) ? arr.filter(v => v !== value) : [...arr, value] };
    });
  };

  const [isGenerating, setIsGenerating] = useState(false);

  const handleNext = async () => {
    if (step < 3) {
      setStep(step + 1);
      return;
    }

    if (form._hp) {
      console.warn('[ProIntakeWizard] Bot detected via honeypot.');
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
          uniqueInsight: form.uniqueInsight,
          acquisitionChannel: form.acquisitionChannel,
          buyerType: form.buyerType,
          revenueModel: form.revenueModel,
          whyNow: form.whyNow,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (res.status === 402) {
          throw new Error('You have run out of credits. Please upgrade your plan.');
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

  const filteredGeos = geoFilter
    ? GEOGRAPHIES.filter(g => g.toLowerCase().includes(geoFilter.toLowerCase()))
    : GEOGRAPHIES;

  return (
    <>
      <div className="bg-surface border border-border rounded-[20px] overflow-hidden mb-7">
        <div className="p-5 px-6 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="font-mono text-[10px] py-[3px] px-2 rounded-full border border-accent/25 bg-accent/5 text-accent tracking-[0.08em]">Pro</span>
            <div>
              <h3 className="text-[14px] font-medium text-text">Deep Market Intelligence</h3>
              <p className="text-[12px] text-muted mt-0.5">More context = exponentially sharper analysis</p>
            </div>
          </div>
          <span className="font-mono text-[11px] text-muted">{filledFields} / {totalCore} core fields</span>
        </div>

        {/* Step Tabs */}
        <div className="flex items-center p-4 px-6 border-b border-border overflow-x-auto whitespace-nowrap">
          {[
            { n: 1, label: 'Niche' },
            { n: 2, label: 'You' },
            { n: 3, label: 'Intel Sources' },
            { n: 4, label: 'Edge' },
          ].map(({ n, label }, i) => (
            <div key={i} className="flex items-center">
              {i > 0 && <div className="w-6 h-px bg-border shrink-0" />}
              <div
                className={cn(
                  "flex items-center gap-2 cursor-pointer py-1.5 px-3.5 rounded-lg transition-all",
                  step === i ? "bg-accent/10 text-text" : "text-muted hover:text-muted-2"
                )}
                onClick={() => setStep(i)}
              >
                <div className={cn(
                  "w-[22px] h-[22px] rounded-full border-[1.5px] flex items-center justify-center font-mono text-[10px] shrink-0 transition-all",
                  step >= i ? "border-accent text-accent" : "border-muted text-muted",
                  step > i && "bg-accent text-bg"
                )}>{n}</div>
                <span className="text-[12px]">{label}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Honeypot */}
        <div aria-hidden="true" style={{ position: 'absolute', left: '-9999px', top: '-9999px', opacity: 0, height: 0, overflow: 'hidden' }}>
          <label htmlFor="_hp_pro">Leave this empty</label>
          <input id="_hp_pro" type="text" name="website" autoComplete="off" tabIndex={-1} value={form._hp} onChange={e => setForm({...form, _hp: e.target.value})} />
        </div>

        {/* Form Body */}
        <div className="p-5 px-6 pb-6">
          {/* STEP 0: Niche */}
          {step === 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-[14px]">
              <div className="flex flex-col gap-1.5 md:col-span-2">
                <label className="text-[12px] font-medium text-muted-2 tracking-[0.03em] flex items-center gap-1.5">Niche description <span className="text-brand-red">*</span> <span className="font-normal text-muted text-[11px] font-mono">— be hyper-specific</span></label>
                <textarea
                  className="bg-surface-2 border border-border-accent rounded-[12px] p-2.5 px-3.5 text-text font-sans text-[14px] outline-none w-full min-h-[80px] focus:border-accent/40 focus:bg-surface-3 transition-colors"
                  placeholder='e.g. "AI-powered nutrition coaching platform for semi-professional CrossFit athletes who struggle with inflammatory responses and overtraining"'
                  value={form.niche} onChange={e => setForm({...form, niche: e.target.value})}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[12px] font-medium text-muted-2 tracking-[0.03em] flex items-center gap-1.5">Primary geography <span className="text-brand-red">*</span></label>
                <input
                  type="text"
                  className="bg-surface-2 border border-border-accent rounded-[12px] p-2.5 px-3.5 text-text text-[14px] outline-none w-full focus:border-accent/40 focus:bg-surface-3 transition-colors"
                  placeholder="Search countries or regions..."
                  value={geoFilter}
                  onChange={e => { setGeoFilter(e.target.value); setForm({...form, geo: ''}); }}
                />
                {(geoFilter || !form.geo) && (
                  <div className="max-h-[160px] overflow-y-auto bg-surface-2 border border-border-accent rounded-[12px] mt-1">
                    {filteredGeos.map(g => (
                      <div
                        key={g}
                        className={cn(
                          "py-2 px-3.5 text-[13px] cursor-pointer transition-colors hover:bg-accent/10",
                          form.geo === g ? "bg-accent/10 text-accent font-medium" : "text-muted-2"
                        )}
                        onClick={() => { setForm({...form, geo: g}); setGeoFilter(g); }}
                      >
                        {g}
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[12px] font-medium text-muted-2 tracking-[0.03em] flex items-center gap-1.5">Business stage <span className="text-brand-red">*</span></label>
                <input
                  type="text"
                  className="bg-surface-2 border border-border-accent rounded-[12px] p-2.5 px-3.5 text-text text-[14px] outline-none w-full focus:border-accent/40 focus:bg-surface-3 transition-colors"
                  placeholder="e.g. Early revenue or pivoting..."
                  value={form.stage} onChange={e => setForm({...form, stage: e.target.value})}
                />
                <div className="flex flex-wrap gap-1.5 mt-1">
                  {STAGES.map(s => (
                    <span key={s} onClick={() => setForm({...form, stage: s})} className={cn("text-[11px] py-1 px-2.5 rounded-full border cursor-pointer transition-all", form.stage === s ? "bg-accent/10 border-accent/40 text-accent font-medium" : "bg-surface border-border-accent text-muted-2 hover:border-accent/30")}>
                      {s}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* STEP 1: You */}
          {step === 1 && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-[14px]">
              <div className="flex flex-col gap-1.5">
                <label className="text-[12px] font-medium text-muted-2 tracking-[0.03em]">Available budget / Resources</label>
                <input type="text" className="bg-surface-2 border border-border-accent rounded-[12px] p-2.5 px-3.5 text-text text-[14px] outline-none w-full focus:border-accent/40 focus:bg-surface-3" placeholder="e.g. $500 or AWS credits..." value={form.budget} onChange={e => setForm({...form, budget: e.target.value})} />
                <div className="flex flex-wrap gap-1.5 mt-1">
                  {BUDGETS.map(b => (
                    <span key={b} onClick={() => setForm({...form, budget: b})} className={cn("text-[11px] py-1 px-2 rounded-full border cursor-pointer transition-all", form.budget === b ? "bg-accent/10 border-accent/40 text-accent font-medium" : "bg-surface border-border-accent text-muted-2 hover:border-accent/30")}>{b}</span>
                  ))}
                </div>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[12px] font-medium text-muted-2 tracking-[0.03em]">Time commitment</label>
                <input type="text" className="bg-surface-2 border border-border-accent rounded-[12px] p-2.5 px-3.5 text-text text-[14px] outline-none w-full focus:border-accent/40 focus:bg-surface-3" placeholder="e.g. 5h/week or personal schedule..." value={form.time} onChange={e => setForm({...form, time: e.target.value})} />
                <div className="flex flex-wrap gap-1.5 mt-1">
                  {TIME_OPTIONS.map(t => (
                    <span key={t} onClick={() => setForm({...form, time: t})} className={cn("text-[11px] py-1 px-2 rounded-full border cursor-pointer transition-all", form.time === t ? "bg-accent/10 border-accent/40 text-accent font-medium" : "bg-surface border-border-accent text-muted-2 hover:border-accent/30")}>{t}</span>
                  ))}
                </div>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[12px] font-medium text-muted-2 tracking-[0.03em]">Goal timeline</label>
                <input type="text" className="bg-surface-2 border border-border-accent rounded-[12px] p-2.5 px-3.5 text-text text-[14px] outline-none w-full focus:border-accent/40 focus:bg-surface-3" placeholder="e.g. 90 days or by year end..." value={form.timeline} onChange={e => setForm({...form, timeline: e.target.value})} />
                <div className="flex flex-wrap gap-1.5 mt-1">
                  {TIMELINES.map(t => (
                    <span key={t} onClick={() => setForm({...form, timeline: t})} className={cn("text-[11px] py-1 px-2 rounded-full border cursor-pointer transition-all", form.timeline === t ? "bg-accent/10 border-accent/40 text-accent font-medium" : "bg-surface border-border-accent text-muted-2 hover:border-accent/30")}>{t}</span>
                  ))}
                </div>
              </div>
              <div className="flex flex-col gap-1.5 md:col-span-3">
                <label className="text-[12px] font-medium text-muted-2 tracking-[0.03em] flex items-center gap-1.5">Existing assets <span className="font-normal text-muted text-[11px] font-mono">— select all that apply</span></label>
                <div className="flex flex-wrap gap-[7px]">
                  {ASSETS.map(opt => (
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

          {/* STEP 2: Intel Sources */}
          {step === 2 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-[14px]">
              <div className="flex flex-col gap-1.5 md:col-span-2">
                <label className="text-[12px] font-medium text-muted-2 tracking-[0.03em] flex items-center gap-1.5">Known competitor URLs <span className="font-normal text-muted text-[11px] font-mono">— up to 5</span></label>
                <input type="text" className="bg-surface-2 border border-border-accent rounded-[12px] p-2.5 px-3.5 text-text text-[14px] outline-none w-full focus:border-accent/40 focus:bg-surface-3" placeholder="e.g. competitor1.com, competitor2.io, competitor3.com" value={form.urls} onChange={e => setForm({...form, urls: e.target.value})} />
              </div>
              <div className="flex flex-col gap-1.5 md:col-span-2 mt-2">
                <label className="text-[12px] font-medium text-muted-2 tracking-[0.03em] flex items-center gap-1.5">Where does your audience complain?</label>
                <div className="flex flex-wrap gap-[7px]">
                  {COMPLAINT_PLATFORMS.map(opt => (
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

          {/* STEP 3: Edge */}
          {step === 3 && (
            <div className="grid grid-cols-1 gap-[14px]">
              <div className="flex flex-col gap-1.5">
                <label className="text-[12px] font-medium text-muted-2 tracking-[0.03em] flex items-center gap-1.5">
                  Your unique insight <span className="font-normal text-muted text-[11px] font-mono">— what do you know that others don't?</span>
                </label>
                <textarea
                  className="bg-surface-2 border border-border-accent rounded-[12px] p-2.5 px-3.5 text-text font-sans text-[14px] outline-none w-full min-h-[80px] focus:border-accent/40 focus:bg-surface-3 transition-colors"
                  placeholder={"e.g. \"I've been a physical therapist for 8 years and noticed that every clinic I've worked at uses paper-based intake forms...\""}
                  value={form.uniqueInsight} onChange={e => setForm({...form, uniqueInsight: e.target.value})}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[12px] font-medium text-muted-2 tracking-[0.03em] flex items-center gap-1.5">
                  Why now? <span className="font-normal text-muted text-[11px] font-mono">— what changed that makes this the right moment?</span>
                </label>
                <input type="text" className="bg-surface-2 border border-border-accent rounded-[12px] p-2.5 px-3.5 text-text text-[14px] outline-none w-full focus:border-accent/40 focus:bg-surface-3" placeholder="e.g. New regulation, competitor shut down, AI made it possible..." value={form.whyNow} onChange={e => setForm({...form, whyNow: e.target.value})} />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[12px] font-medium text-muted-2 tracking-[0.03em]">Who is your buyer?</label>
                <div className="flex flex-wrap gap-1.5">
                  {["Consumers (B2C)", "Small businesses (SMB)", "Mid-market (B2B)", "Enterprise", "Government"].map(t => (
                    <span key={t} onClick={() => setForm({...form, buyerType: t})} className={cn("text-[11px] py-1 px-2.5 rounded-full border cursor-pointer transition-all", form.buyerType === t ? "bg-accent/10 border-accent/40 text-accent font-medium" : "bg-surface border-border-accent text-muted-2 hover:border-accent/30")}>{t}</span>
                  ))}
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[12px] font-medium text-muted-2 tracking-[0.03em]">Revenue model preference</label>
                <div className="flex flex-wrap gap-1.5">
                  {["SaaS / Subscription", "Marketplace", "Agency / Services", "Info Product / Course", "E-commerce", "Consulting"].map(t => (
                    <span key={t} onClick={() => setForm({...form, revenueModel: t})} className={cn("text-[11px] py-1 px-2.5 rounded-full border cursor-pointer transition-all", form.revenueModel === t ? "bg-accent/10 border-accent/40 text-accent font-medium" : "bg-surface border-border-accent text-muted-2 hover:border-accent/30")}>{t}</span>
                  ))}
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[12px] font-medium text-muted-2 tracking-[0.03em]">Primary acquisition channel</label>
                <div className="flex flex-wrap gap-1.5">
                  {["SEO / Content", "Paid Ads", "Social Media (Organic)", "Cold Outreach", "Community / Word of Mouth", "Partnerships", "Referral Program"].map(t => (
                    <span key={t} onClick={() => setForm({...form, acquisitionChannel: t})} className={cn("text-[11px] py-1 px-2.5 rounded-full border cursor-pointer transition-all", form.acquisitionChannel === t ? "bg-accent/10 border-accent/40 text-accent font-medium" : "bg-surface border-border-accent text-muted-2 hover:border-accent/30")}>{t}</span>
                  ))}
                </div>
              </div>

              <p className="text-[11px] text-muted mt-1">These signals shape your Unit Economics, GTM plan, and moat strategies.</p>
            </div>
          )}
        </div>

        {/* Error Display */}
        {error && step === 3 && (
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
            {step === 3
              ? isGenerating ? "Generating..." : "Generate Pro Report"
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
          {FOUNDER_FIT_STATEMENTS.map(statement => {
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
        <div className="text-[12px] text-muted-2 mb-2.5 font-medium">Report quality signal — fill in more context for exponentially better output</div>
        <div className="h-1.5 bg-surface-3 rounded-[3px] overflow-hidden mb-2">
          <div
            className="h-full rounded-[3px] bg-gradient-to-r from-brand-red via-accent-5 to-accent transition-all duration-400 ease-out"
            style={{ width: `${progressPercent}%` }}
          ></div>
        </div>
        <div className="text-[11px] text-muted font-mono">
          {filledFields < totalCore ? "Add your unique insight and competitive intelligence for maximum report quality." : "Maximum confidence signal achieved. Ready to generate."}
        </div>
      </div>
    </>
  );
}
