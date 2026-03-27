export function Footer() {
  return (
    <footer className="border-t border-border pt-10 pb-10 mt-5">
      <div className="max-w-[1180px] mx-auto px-7 flex flex-col md:flex-row justify-between items-start gap-10">
        
        <div className="flex-1">
          <a href="#" className="font-mono text-[14px] font-medium text-accent tracking-[0.06em] no-underline flex items-center gap-2 mb-4">
            <span className="w-2 h-2 rounded-full bg-accent animate-pulse"></span> ScopyAI
          </a>
          <p className="text-[12px] text-muted max-w-[280px] leading-[1.6]">
            The anti-fragile intelligence engine. We destroy weak ideas before they cost you years of your life.
          </p>
          <div className="flex items-center gap-5 mt-5">
            <span className="font-mono text-[10px] text-muted border border-border py-1 px-2.5 rounded-md flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-accent-4"></div> System Active
            </span>
          </div>
        </div>
        
        <div className="flex gap-16">
          <div className="flex flex-col">
            <h5 className="font-mono text-[11px] uppercase tracking-[0.1em] text-muted mb-3">Product</h5>
            <a href="#modules" className="text-[13px] text-muted-2 py-1 transition-colors hover:text-text">Intelligence Layers</a>
            <a href="#output" className="text-[13px] text-muted-2 py-1 transition-colors hover:text-text">Scorecard Output</a>
            <a href="#pricing" className="text-[13px] text-muted-2 py-1 transition-colors hover:text-text">Pricing Tiers</a>
            <a href="#" className="text-[13px] text-muted-2 py-1 transition-colors hover:text-text">Sample Reports</a>
          </div>
          <div className="flex flex-col">
            <h5 className="font-mono text-[11px] uppercase tracking-[0.1em] text-muted mb-3">Company</h5>
            <a href="#" className="text-[13px] text-muted-2 py-1 transition-colors hover:text-text">About Us</a>
            <a href="#" className="text-[13px] text-muted-2 py-1 transition-colors hover:text-text">Changelog</a>
            <a href="#" className="text-[13px] text-muted-2 py-1 transition-colors hover:text-text">Agency Partners</a>
          </div>
        </div>
        
      </div>
      
      <div className="max-w-[1180px] mx-auto px-7 mt-5 pt-5 border-t border-border flex flex-col md:flex-row justify-between text-[11px] text-muted">
        <span>© 2026 ScopyAI. All rights reserved.</span>
        <div className="flex gap-4">
          <a href="#" className="hover:text-text transition-colors">Privacy Policy</a>
          <a href="#" className="hover:text-text transition-colors">Terms of Service</a>
        </div>
      </div>
    </footer>
  );
}
