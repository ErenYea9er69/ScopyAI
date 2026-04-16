'use client';

import { useState } from 'react';
import { IntakeWizard } from './IntakeWizard';
import { ProIntakeWizard } from './ProIntakeWizard';
import { cn } from '@/lib/utils';

export function WizardContainer() {
  const [tier, setTier] = useState<'casual' | 'pro'>('casual');

  return (
    <div className="w-full">
      {/* Toggle Header Element */}
      <div className="flex justify-center mb-6">
        <div className="bg-surface-2 border border-border-accent rounded-full p-1 flex items-center gap-1">
          <button
            onClick={() => setTier('casual')}
            className={cn(
              "px-5 py-2 rounded-full text-[13px] font-medium transition-all",
              tier === 'casual' 
                ? "bg-surface border border-border shadow-sm text-text" 
                : "text-muted-2 hover:text-text cursor-pointer"
            )}
          >
            Casual Mode
          </button>
          <button
            onClick={() => setTier('pro')}
            className={cn(
              "px-5 py-2 rounded-full text-[13px] font-medium transition-all flex items-center gap-2",
              tier === 'pro' 
                ? "bg-accent/10 border border-accent/20 text-accent font-semibold" 
                : "text-muted-2 hover:text-text cursor-pointer"
            )}
          >
            Pro Mode <span className="text-[10px] bg-accent text-bg px-1.5 py-0.5 rounded uppercase tracking-wider">Deep</span>
          </button>
        </div>
      </div>

      {tier === 'casual' ? <IntakeWizard /> : <ProIntakeWizard />}
    </div>
  );
}
