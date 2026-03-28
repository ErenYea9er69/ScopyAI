'use client';

import { useState, useEffect } from 'react';
import { Navbar } from '@/components/landing/Navbar';
import Link from 'next/link';
import { cn } from '@/lib/utils';

type ReportSummary = {
  id: string;
  niche: string;
  persona: string;
  status: 'pending' | 'generating' | 'complete' | 'failed';
  generatedAt: string;
  compositeScore?: number;
};

type UserData = {
  id: string;
  credits: number;
  plan: string;
};

export default function DashboardPage() {
  const [reports, setReports] = useState<ReportSummary[]>([]);
  const [user, setUser] = useState<UserData | null>(null);

  useEffect(() => {
    const loadReports = async () => {
      try {
        const res = await fetch('/api/report');
        if (res.ok) {
          const data = await res.json();
          setReports(data.reports || []);
        }
      } catch (err) {
        console.error(err);
      }
    };
    
    const loadUser = async () => {
      try {
        const res = await fetch('/api/me');
        if (res.ok) setUser(await res.json());
      } catch (err) {}
    };

    loadUser();
    loadReports();
    const interval = setInterval(loadReports, 5000);
    return () => clearInterval(interval);
  }, []);

  const refillCredits = async () => {
    try {
      const res = await fetch('/api/me', { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        setUser(prev => prev ? { ...prev, credits: data.credits } : null);
      }
    } catch (err) {}
  };

  const statusBadge = (status: string) => {
    const map: Record<string, { bg: string; text: string }> = {
      pending: { bg: 'bg-muted/10 border-muted/20', text: 'text-muted' },
      generating: { bg: 'bg-accent/10 border-accent/20', text: 'text-accent' },
      complete: { bg: 'bg-accent-4/10 border-accent-4/20', text: 'text-accent-4' },
      failed: { bg: 'bg-brand-red/10 border-brand-red/20', text: 'text-brand-red' },
    };
    const s = map[status] || map.pending;
    return (
      <span className={cn("font-mono text-[10px] py-[3px] px-2 rounded-full border tracking-[0.08em]", s.bg, s.text)}>
        {status}
      </span>
    );
  };

  const personaEmoji: Record<string, string> = {
    dev: '💻', marketer: '📈', creator: '📸', consultant: '🤝', general: '🛠️',
  };

  return (
    <>
      <Navbar />
      <div className="max-w-[900px] mx-auto px-7 py-10">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-[24px] font-medium">Dashboard</h1>
            <p className="text-[13px] text-muted mt-1">Your market intelligence reports</p>
          </div>
          <div className="flex items-center gap-3">
            {user && (
              <div className="font-mono text-[11px] text-muted border border-border bg-surface py-1.5 px-3 rounded-lg flex items-center gap-2 relative group">
                <span className={cn("w-1.5 h-1.5 rounded-full", user.credits > 0 ? "bg-accent" : "bg-brand-red")} />
                <span className={user.credits === 0 ? "text-brand-red" : ""}>{user.credits} Credits ({user.plan})</span>
                <button 
                  onClick={refillCredits} 
                  className="ml-2 text-[10px] text-accent/50 hover:text-accent opacity-0 group-hover:opacity-100 transition-opacity"
                  title="Dev Only: Refill Credits"
                >
                  +10 🛠️
                </button>
              </div>
            )}
            <Link
              href="/#intake"
              className="text-[13px] font-medium py-2 px-5 rounded-lg border border-accent bg-accent text-bg hover:shadow-[0_4px_16px_rgba(200,242,100,0.2)] transition-shadow"
            >
              + New Report
            </Link>
          </div>
        </div>

        {/* Reports List */}
        {reports.length === 0 ? (
          <div className="bg-surface border border-border rounded-[20px] p-12 text-center">
            <div className="text-[40px] mb-4">📭</div>
            <h3 className="text-[16px] font-medium mb-2">No reports yet</h3>
            <p className="text-[13px] text-muted mb-6 max-w-[360px] mx-auto">
              Enter a niche in the Intake Wizard and the Crucible will generate your first market intelligence report.
            </p>
            <Link
              href="/#intake"
              className="inline-flex items-center gap-2 text-[13px] font-medium py-2.5 px-6 rounded-lg border border-accent bg-accent text-bg hover:shadow-[0_4px_16px_rgba(200,242,100,0.2)] transition-shadow"
            >
              Start the Crucible Test
            </Link>
          </div>
        ) : (
          <div className="space-y-2.5">
            {reports.map((r) => (
              <Link
                key={r.id}
                href={`/report/${r.id}`}
                className="flex items-center gap-4 bg-surface border border-border rounded-[14px] p-4 px-5 hover:border-border-accent transition-colors group"
              >
                <div className="text-[20px]">{personaEmoji[r.persona] || '📊'}</div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-[14px] font-medium text-text truncate group-hover:text-accent transition-colors">
                    {r.niche}
                  </h4>
                  <p className="text-[11px] text-muted font-mono mt-0.5">
                    {new Date(r.generatedAt).toLocaleDateString('en-GB', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </p>
                </div>
                {r.compositeScore !== undefined && (
                  <span className={cn(
                    "font-mono text-[13px] font-semibold",
                    r.compositeScore >= 70 ? "text-accent-4" :
                    r.compositeScore >= 40 ? "text-accent-5" : "text-brand-red"
                  )}>
                    {r.compositeScore}/100
                  </span>
                )}
                {statusBadge(r.status)}
              </Link>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
