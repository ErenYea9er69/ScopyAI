import Link from "next/link";

export default function SignupPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-bg px-4 py-10">
      <div className="w-full max-w-[400px]">
        <Link href="/" className="font-mono text-[14px] font-medium text-accent tracking-[0.06em] no-underline flex items-center gap-2 mb-8 justify-center">
          <span className="w-2 h-2 rounded-full bg-accent animate-[pulse_2s_infinite]"></span> ScopyAI
        </Link>
        <div className="bg-surface border border-accent/20 rounded-[20px] p-8 shadow-[0_20px_50px_-12px_rgba(200,242,100,0.05)]">
          <div className="font-mono text-[10px] py-[3px] px-2 rounded-full border border-accent/20 bg-accent/5 text-accent tracking-[0.08em] mb-3 inline-block">Free Trial</div>
          <h2 className="text-[20px] font-medium mb-1">Create an account</h2>
          <p className="text-[13px] text-muted mb-6 leading-[1.5]">Your first market report is free. No credit card required.</p>
          
          <form className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-[12px] font-medium text-muted-2">Full Name</label>
              <input type="text" className="bg-surface-2 border border-border-accent rounded-[12px] p-2.5 px-3.5 text-text text-[14px] outline-none w-full focus:border-accent/40 focus:bg-surface-3 transition-colors" placeholder="Ada Lovelace" />
            </div>
            
            <div className="flex flex-col gap-1.5">
              <label className="text-[12px] font-medium text-muted-2">Email address</label>
              <input type="email" className="bg-surface-2 border border-border-accent rounded-[12px] p-2.5 px-3.5 text-text text-[14px] outline-none w-full focus:border-accent/40 focus:bg-surface-3 transition-colors" placeholder="ada@analyticalengine.com" />
            </div>
            
            <div className="flex flex-col gap-1.5">
              <label className="text-[12px] font-medium text-muted-2">Password</label>
              <input type="password" className="bg-surface-2 border border-border-accent rounded-[12px] p-2.5 px-3.5 text-text text-[14px] outline-none w-full focus:border-accent/40 focus:bg-surface-3 transition-colors" placeholder="••••••••" />
              <div className="text-[11px] text-muted mt-1">Must be at least 8 characters.</div>
            </div>
            
            <button type="button" className="mt-4 w-full font-sans text-[13px] font-medium py-3 px-5 rounded-lg border border-accent bg-accent text-bg transition-shadow hover:shadow-[0_4px_16px_rgba(200,242,100,0.2)]">
              Create Account
            </button>
            <p className="text-[11px] text-muted text-center mt-2 leading-[1.5]">By signing up, you agree to our Terms of Service and Privacy Policy.</p>
          </form>
          
          <div className="mt-6 text-center text-[12px] text-muted border-t border-border pt-5">
            Already have an account? <Link href="/login" className="text-text hover:text-accent transition-colors underline decoration-border-accent underline-offset-2">Sign in</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
