import type { FullReport } from '@/types/report';

export type ProgressEvent = {
  step: string;
  layer?: string;
  status: string;
  timestamp: number;
};

// Global singleton pattern to prevent data loss across hot reloads in Next.js development
const globalStore = globalThis as unknown as {
  reportStore: Map<string, FullReport>;
  progressStore: Map<string, ProgressEvent[]>;
  userStore: Map<string, { 
    credits: number; 
    plan: 'Explorer' | 'Pro' | 'Agency';
    settings?: {
      slackWebhook?: string;
      companyName?: string;
      brandColor?: string;
    }
  }>;
};

export const reportStore = globalStore.reportStore || (globalStore.reportStore = new Map());
export const progressStore = globalStore.progressStore || (globalStore.progressStore = new Map());

// Mock user store for credit system & settings testing before Supabase wiring
export const userStore = globalStore.userStore || (globalStore.userStore = new Map([
  ['default_user', { 
    credits: 10, 
    plan: 'Agency', // Upgraded to Agency to test white-label features
    settings: {
      companyName: 'Acme Intelligence',
      brandColor: '#C8F264' // Default accent
    }
  }]
]));

