/**
 * In-memory stores for reports and progress.
 *
 * In production these will be replaced with Supabase queries,
 * but for Phase 2 dev/testing we use simple Maps so the pipeline
 * can run end-to-end without a database.
 */

import type { FullReport } from '@/types/report';

// Completed / in-progress reports keyed by reportId
export const reportStore = new Map<string, FullReport>();

// Progress events keyed by reportId (array of timestamped updates)
export type ProgressEvent = {
  step: string;
  layer?: string;
  status: string;
  timestamp: number;
};

export const progressStore = new Map<string, ProgressEvent[]>();
