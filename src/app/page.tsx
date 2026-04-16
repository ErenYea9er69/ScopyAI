import { Navbar } from "@/components/landing/Navbar";
import { Hero } from "@/components/landing/Hero";
import { SocialProof } from "@/components/landing/SocialProof";
import { Shield } from "@/components/landing/Shield";
import { WizardContainer } from "@/components/intake/WizardContainer";
import { Footer } from "@/components/landing/Footer";
import Link from "next/link";
import dynamic from "next/dynamic";

// Dynamic imports for heavy below-fold sections (code-split for faster initial load)
const ModuleGrids = dynamic(() => import("@/components/landing/ModuleGrids").then(m => ({ default: m.ModuleGrids })), { ssr: true });
const RiskRadar = dynamic(() => import("@/components/landing/RiskRadar").then(m => ({ default: m.RiskRadar })), { ssr: true });
const ScorecardPreview = dynamic(() => import("@/components/landing/ScorecardPreview").then(m => ({ default: m.ScorecardPreview })), { ssr: true });
const AutoPivotPreview = dynamic(() => import("@/components/landing/AutoPivotPreview").then(m => ({ default: m.AutoPivotPreview })), { ssr: true });
const MoatGrid = dynamic(() => import("@/components/landing/MoatGrid").then(m => ({ default: m.MoatGrid })), { ssr: true });

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  "name": "ScopyAI",
  "applicationCategory": "BusinessApplication",
  "operatingSystem": "Web",
  "description": "AI-powered market intelligence engine. Enter a niche and get a complete, sourced, confidence-scored intelligence report in 4 minutes.",
  "url": "https://scopyai.com",
  "offers": [
    { "@type": "Offer", "name": "Explorer", "price": "0", "priceCurrency": "USD", "description": "1 free market report" },
    { "@type": "Offer", "name": "Pro", "price": "29.00", "priceCurrency": "USD", "description": "Unlimited reports, exports, and Niche Duel" },
    { "@type": "Offer", "name": "Agency", "price": "99.00", "priceCurrency": "USD", "description": "White-label PDFs, API access, client workspaces" },
  ],
  "featureList": [
    "Live web research with Tavily Deep Search",
    "8-layer market intelligence analysis",
    "Confidence-scored competitive intelligence",
    "Auto-pivot niche suggestions",
    "PDF, Markdown, and JSON export",
    "Niche Duel head-to-head comparison",
    "AI Report Chat for follow-up questions"
  ],
};

export default function LandingPage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <Navbar />
      <div className="max-w-[1180px] mx-auto px-7">
        <Hero />
        <SocialProof />
        <Shield />
        
        <div className="flex items-center gap-3.5 my-7" id="intake">
          <div className="flex-1 h-px bg-border"></div>
          <div className="font-mono text-[10px] tracking-[0.1em] uppercase text-muted">Smart Intake — Personalised Intelligence</div>
          <div className="flex-1 h-px bg-border"></div>
        </div>
        
        <WizardContainer />
        <ModuleGrids />
        <RiskRadar />
        
        <div className="flex items-center gap-3.5 my-7" id="output">
          <div className="flex-1 h-px bg-border"></div>
          <div className="font-mono text-[10px] tracking-[0.1em] uppercase text-muted">Output — Market Viability Scorecard</div>
          <div className="flex-1 h-px bg-border"></div>
        </div>
        
        <ScorecardPreview />
        <AutoPivotPreview />
        <MoatGrid />

        {/* Comparison Table */}
        <div className="my-10 overflow-x-auto">
          <table className="w-full border-collapse min-w-[600px]">
            <thead>
              <tr>
                <th className="p-3 px-4 text-left border-b border-border text-[11px] font-mono uppercase tracking-[0.08em] text-muted font-medium w-[40%]">Feature</th>
                <th className="p-3 px-4 text-left border-b border-border text-[11px] font-mono uppercase tracking-[0.08em] text-muted font-medium bg-accent/5">ScopyAI</th>
                <th className="p-3 px-4 text-left border-b border-border text-[11px] font-mono uppercase tracking-[0.08em] text-muted font-medium">ChatGPT / Claude</th>
                <th className="p-3 px-4 text-left border-b border-border text-[11px] font-mono uppercase tracking-[0.08em] text-muted font-medium">Consultancy</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="p-3 px-4 text-[13px] border-b border-border text-text font-medium">Data freshness</td>
                <td className="p-3 px-4 text-[13px] border-b border-border text-muted-2 bg-accent/5"><span className="text-accent">Live web scraping</span></td>
                <td className="p-3 px-4 text-[13px] border-b border-border text-muted-2">Cutoff date (months old)</td>
                <td className="p-3 px-4 text-[13px] border-b border-border text-muted-2">Manual (days/weeks)</td>
              </tr>
              <tr>
                <td className="p-3 px-4 text-[13px] border-b border-border text-text font-medium">Source citations</td>
                <td className="p-3 px-4 text-[13px] border-b border-border text-muted-2 bg-accent/5"><span className="text-accent">✓ Every claim</span></td>
                <td className="p-3 px-4 text-[13px] border-b border-border text-muted-2"><span className="text-brand-red opacity-50">✗ Hallucinates URLs</span></td>
                <td className="p-3 px-4 text-[13px] border-b border-border text-muted-2">Inconsistent</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Pricing Grid */}
        <div className="flex items-center gap-3.5 my-7" id="pricing">
          <div className="flex-1 h-px bg-border"></div>
          <div className="font-mono text-[10px] tracking-[0.1em] uppercase text-muted">Transparent Pricing</div>
          <div className="flex-1 h-px bg-border"></div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 mb-7">
          <div className="bg-surface border border-border rounded-[20px] p-6 transition-transform hover:-translate-y-1">
            <h4 className="text-[14px] font-medium mb-1">Explorer</h4>
            <div className="font-mono text-[32px] font-medium mb-1">$0<small className="text-[14px] text-muted font-sans">/mo</small></div>
            <p className="text-[12px] text-muted mb-4 leading-[1.5]">Test the engine on your first idea.</p>
            <ul className="mb-5 flex flex-col gap-2">
              <li className="text-[12px] text-muted-2 flex items-center gap-2"><span className="text-accent-4 text-[11px]">✓</span> 1 full market report</li>
            </ul>
            <Link href="/signup" className="block w-full text-center py-2.5 rounded-lg border border-border-accent bg-surface-2 text-[13px] font-medium text-muted-2 hover:text-text hover:border-accent transition-colors">Start Free</Link>
          </div>
          
          <div className="bg-surface border border-accent/30 rounded-[20px] p-6 relative transition-transform hover:-translate-y-1">
            <div className="absolute -top-2.5 right-4 bg-accent text-bg font-mono text-[10px] px-2.5 py-0.5 rounded-full font-medium">Most popular</div>
            <h4 className="text-[14px] font-medium mb-1">Pro</h4>
            <div className="font-mono text-[32px] font-medium mb-1">$29<small className="text-[14px] text-muted font-sans">/mo</small></div>
            <p className="text-[12px] text-muted mb-4 leading-[1.5]">For serial builders who test constantly.</p>
            <ul className="mb-5 flex flex-col gap-2">
              <li className="text-[12px] text-muted-2 flex items-center gap-2"><span className="text-accent-4 text-[11px]">✓</span> Unlimited reports</li>
              <li className="text-[12px] text-muted-2 flex items-center gap-2"><span className="text-accent-4 text-[11px]">✓</span> Export to PDF & Notion</li>
            </ul>
            <Link href="/signup" className="block w-full text-center py-2.5 rounded-lg border border-accent bg-accent text-[13px] font-medium text-bg hover:shadow-[0_4px_16px_rgba(200,242,100,0.2)] transition-shadow">Subscribe Pro</Link>
          </div>
        </div>
        
        {/* CTA */}
        <div className="text-center py-10 pb-16">
          <h2 className="text-[24px] font-medium mb-4">Stop building blind.</h2>
          <Link href="/signup" className="inline-flex items-center gap-2.5 bg-accent text-bg font-sans text-[15px] font-semibold py-3.5 px-8 rounded-full hover:-translate-y-0.5 hover:shadow-[0_8px_24px_rgba(200,242,100,0.2)] transition-all">
            Start the Crucible Test
          </Link>
          <div className="text-[12px] text-muted mt-3">No credit card required for your first idea.</div>
        </div>
        
      </div>
      <Footer />
    </>
  );
}
