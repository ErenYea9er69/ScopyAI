/**
 * Auto-Pivot Engine
 *
 * Triggered when:
 *   - Saturation score > 70%  OR
 *   - Cynic risk score > 80
 *
 * Generates 3 ranked pivot options:
 *   Pivot A (Best fit)   — lowest saturation + matches user skills
 *   Pivot B (Alternate)  — different geography or vertical
 *   Pivot C (High friction) — high potential but needs more resources
 */

import { generateStructuredOutput, MODELS } from './client';
import { autoPivotSchema, type AutoPivotResult } from '@/types/report';
import type { ResearchData } from '@/lib/research/orchestrator';

export function shouldTriggerPivot(saturation: number, cynicScore: number): boolean {
  return saturation > 70 || cynicScore > 80;
}

export async function runAutoPivot(
  niche: string,
  saturation: number,
  cynicScore: number,
  research: ResearchData,
  userContext: { budget: string; time: string; assets: string[]; stage: string }
): Promise<AutoPivotResult> {
  if (!shouldTriggerPivot(saturation, cynicScore)) {
    return {
      triggered: false,
      reason: 'Saturation and risk scores are within acceptable range.',
      pivots: [],
    };
  }

  console.log(`[Auto-Pivot] Triggered! Saturation=${saturation}%, Cynic=${cynicScore}/100`);

  const system = `
You are the Auto-Pivot Engine. The user's original niche has been flagged as too risky or saturated.
Your job is to generate exactly 3 ranked pivot options.

Pivot A (Best Fit): Lowest saturation + best match for user's skills/budget/assets.
Pivot B (Alternate Market): Same core idea but different geography or vertical with less competition.
Pivot C (High Friction): Highest potential but requires significantly more resources or expertise than the user currently has.

Each pivot must include:
- rank ("A", "B", "C")
- title (the pivot niche/idea)
- description (why this pivot works)
- newSaturation (estimated %, must be lower than original)
- executionFit ("Easy", "Moderate", "Hard", or "Impossible" for THIS user)
- reasoning (1-2 sentences)

Also include:
- triggered: true
- reason: why the pivot was triggered

OUTPUT: Valid JSON with keys: triggered, reason, pivots[]
`.trim();

  const user = `
ORIGINAL NICHE: ${niche}
SATURATION: ${saturation}%
CYNIC RISK SCORE: ${cynicScore}/100
USER BUDGET: ${userContext.budget}
USER TIME: ${userContext.time}
USER ASSETS: ${userContext.assets.join(', ') || 'None'}
USER STAGE: ${userContext.stage}

=== RESEARCH DATA (condensed) ===
MARKET: ${research.marketSize.slice(0, 2).join(' | ')}
COMPETITORS: ${research.competitors.slice(0, 2).join(' | ')}
PAIN POINTS: ${research.painPoints.slice(0, 2).join(' | ')}
TRENDS: ${research.trends.slice(0, 2).join(' | ')}

Generate 3 pivots. Each must be concretely different from the original niche.
Pivot A must be genuinely achievable by this user within their budget and timeline.
`.trim();

  try {
    return await generateStructuredOutput(system, user, autoPivotSchema, MODELS.REASONING);
  } catch (err) {
    console.error('[Auto-Pivot] Failed to generate pivots:', err);
    return {
      triggered: true,
      reason: `Saturation=${saturation}%, Cynic=${cynicScore}/100, but pivot generation failed.`,
      pivots: [],
    };
  }
}
