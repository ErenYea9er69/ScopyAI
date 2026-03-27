import Link from "next/link";

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-bg px-4">
      <div className="w-full max-w-[400px]">
        <Link href="/" className="font-mono text-[14px] font-medium text-accent tracking-[0.06em] no-underline flex items-center gap-2 mb-8 justify-center">
          <span className="w-2 h-2 rounded-full bg-accent animate-pulse"></span> ScopyAI
        </Link>
        <div className="bg-surface border border-border rounded-[20px] p-8 shadow-2xl">
          <h2 className="text-[20px] font-medium mb-1">Welcome back</h2>
          <p className="text-[13px] text-muted mb-6">Enter your credentials to access your reports.</p>
          
          <form className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-[12px] font-medium text-muted-2">Email address</label>
              <input type="email" className="bg-surface-2 border border-border-accent rounded-[12px] p-2.5 px-3.5 text-text text-[14px] outline-none w-full focus:border-accent/40 focus:bg-surface-3 transition-colors" placeholder="you@company.com" />
            </div>
            
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <label className="text-[12px] font-medium text-muted-2">Password</label>
                <a href="#" className="text-[11px] text-accent hover:underline">Forgot?</a>
              </div>
              <input type="password" className="bg-surface-2 border border-border-accent rounded-[12px] p-2.5 px-3.5 text-text text-[14px] outline-none w-full focus:border-accent/40 focus:bg-surface-3 transition-colors" placeholder="••••••••" />
            </div>
            
            <button type="button" className="mt-2 w-full font-sans text-[13px] font-medium py-3 px-5 rounded-lg border border-accent bg-accent text-bg transition-shadow hover:shadow-[0_4px_16px_rgba(200,242,100,0.2)]">
              Sign In
            </button>
          </form>
          
          <div className="mt-6 text-center text-[12px] text-muted">
            Don't have an account? <Link href="/signup" className="text-text hover:text-accent transition-colors underline decoration-border-accent underline-offset-2">Start the Crucible</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
