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
};

export const reportStore = globalStore.reportStore || (globalStore.reportStore = new Map());
export const progressStore = globalStore.progressStore || (globalStore.progressStore = new Map());
