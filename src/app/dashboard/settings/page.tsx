'use client';

import { useState, useEffect } from 'react';
import { Navbar } from '@/components/landing/Navbar';
import Link from 'next/link';

export default function SettingsPage() {
  const [settings, setSettings] = useState({
    companyName: '',
    brandColor: '#C8F264',
    slackWebhook: ''
  });
  const [isSaving, setIsSaving] = useState(false);
  const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'success' | 'failed'>('idle');

  useEffect(() => {
    fetch('/api/me').then(res => res.json()).then(data => {
      if (data.settings) setSettings(data.settings);
    });
  }, []);

  const saveSettings = async () => {
    setIsSaving(true);
    try {
      await fetch('/api/me', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ settings })
      });
    } finally {
      setIsSaving(false);
    }
  };

  const testSlack = async () => {
    if (!settings.slackWebhook) return;
    setTestStatus('testing');
    try {
      const res = await fetch('/api/slack/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ webhookUrl: settings.slackWebhook })
      });
      setTestStatus(res.ok ? 'success' : 'failed');
      setTimeout(() => setTestStatus('idle'), 3000);
    } catch {
      setTestStatus('failed');
    }
  };

  return (
    <>
      <Navbar />
      <div className="max-w-[700px] mx-auto px-7 py-10">
        <div className="flex items-center gap-4 mb-8">
          <Link href="/dashboard" className="w-10 h-10 rounded-xl border border-border flex items-center justify-center text-muted hover:text-text hover:bg-surface-2 transition-colors">
            ←
          </Link>
          <div>
            <h1 className="text-[24px] font-medium">Settings & Integrations</h1>
            <p className="text-[13px] text-muted">Manage your Agency white-label styling and notifications.</p>
          </div>
        </div>

        <div className="space-y-8">
          {/* White-Label Settings */}
          <section className="bg-surface border border-border rounded-2xl p-6">
            <div className="flex items-center gap-3 border-b border-border pb-4 mb-6">
              <span className="text-[20px]">🎨</span>
              <h2 className="text-[16px] font-medium">Agency White-Label</h2>
              <span className="font-mono text-[10px] bg-accent/10 text-accent px-2 py-1 rounded-md ml-auto">Agency Plan Only</span>
            </div>
            
            <div className="space-y-5">
              <div>
                <label className="block text-[13px] text-muted-2 mb-2">Company Name</label>
                <input 
                  type="text" 
                  value={settings.companyName}
                  onChange={e => setSettings({...settings, companyName: e.target.value})}
                  className="w-full bg-surface-2 border border-border-accent rounded-xl px-4 py-3 text-[14px] outline-none focus:border-accent"
                  placeholder="e.g. ScopyAI Consulting"
                />
                <p className="text-[11px] text-muted mt-2">Replaces "ScopyAI Intelligence" throughout the PDF reports.</p>
              </div>

              <div>
                <label className="block text-[13px] text-muted-2 mb-2">Primary Brand Color</label>
                <div className="flex items-center gap-3">
                  <input 
                    type="color" 
                    value={settings.brandColor}
                    onChange={e => setSettings({...settings, brandColor: e.target.value})}
                    className="w-12 h-12 rounded-lg cursor-pointer bg-surface-2 border border-border-accent p-1"
                  />
                  <input 
                    type="text" 
                    value={settings.brandColor}
                    onChange={e => setSettings({...settings, brandColor: e.target.value})}
                    className="flex-1 bg-surface-2 border border-border-accent rounded-xl px-4 py-3 text-[14px] outline-none focus:border-accent font-mono"
                  />
                </div>
              </div>
            </div>
          </section>

          {/* Slack Integration */}
          <section className="bg-surface border border-border rounded-2xl p-6">
            <div className="flex items-center gap-3 border-b border-border pb-4 mb-6">
              <span className="text-[20px]">💬</span>
              <h2 className="text-[16px] font-medium">Slack Digest</h2>
              <span className="font-mono text-[10px] bg-[#64AAFF]/10 text-[#64AAFF] px-2 py-1 rounded-md ml-auto">Pro / Agency Plan</span>
            </div>

            <div>
              <label className="block text-[13px] text-muted-2 mb-2">Incoming Webhook URL</label>
              <input 
                type="text" 
                value={settings.slackWebhook}
                onChange={e => setSettings({...settings, slackWebhook: e.target.value})}
                className="w-full bg-surface-2 border border-border-accent rounded-xl px-4 py-3 text-[14px] outline-none focus:border-[#64AAFF]"
                placeholder="https://hooks.slack.com/services/..."
              />
              <p className="text-[11px] text-muted mt-2 mb-4">You will receive automated monthly digests and competitor alerts to this channel.</p>
              
              <button 
                onClick={testSlack}
                disabled={!settings.slackWebhook || testStatus === 'testing'}
                className="text-[12px] font-medium px-4 py-2 rounded-lg border border-border bg-surface-2 hover:bg-surface-3 transition-colors disabled:opacity-50"
              >
                {testStatus === 'testing' ? 'Sending...' : 
                 testStatus === 'success' ? '✓ Message Sent' : 
                 testStatus === 'failed' ? '✕ Failed' : 'Test Connection'}
              </button>
            </div>
          </section>

          <div className="pt-4 flex justify-end">
             <button 
                onClick={saveSettings}
                disabled={isSaving}
                className="bg-accent text-bg font-medium text-[13px] px-8 py-3 rounded-xl hover:shadow-[0_4px_16px_rgba(200,242,100,0.2)] transition-shadow"
             >
               {isSaving ? 'Saving...' : 'Save Settings'}
             </button>
          </div>
        </div>
      </div>
    </>
  );
}
