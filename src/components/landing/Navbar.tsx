import Link from 'next/link';

export function Navbar() {
  return (
    <nav className="flex items-center justify-between px-7 py-5 border-b border-border sticky top-0 z-[100] bg-[#0D0D0E]/90 backdrop-blur-md">
      <Link href="/" className="font-mono text-[14px] font-medium text-accent tracking-[0.06em] no-underline flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-accent animate-[pulse_2.4s_ease-in-out_infinite]"></span> ScopyAI
      </Link>
      <div className="hidden md:flex items-center gap-6">
        <Link href="/duel" className="text-[13px] text-accent/80 font-medium no-underline transition-colors hover:text-accent flex items-center gap-1.5">
          <span className="text-[14px]">⚔️</span> Niche Duel
        </Link>
        <a href="/#modules" className="text-[13px] text-muted-2 no-underline transition-colors hover:text-text">Modules</a>
        <a href="/#output" className="text-[13px] text-muted-2 no-underline transition-colors hover:text-text">Output</a>
        <a href="/#pricing" className="text-[13px] text-muted-2 no-underline transition-colors hover:text-text">Pricing</a>
        <Link href="/dashboard" className="font-mono text-[11px] text-text border border-border-accent py-1 px-2.5 rounded-full hover:bg-surface-2 transition-colors">
          Dashboard
        </Link>
      </div>
    </nav>
  );
}
