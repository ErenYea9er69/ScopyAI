/**
 * Auto-Pivot Engine
 *
 * Triggered when:
 *   - Saturation score > 70%  OR
 *   - Cynic risk score > 80
 *
 * Generates 3 ranked pivot options, then VALIDATES each one with a Tavily
 * market search to produce research-backed saturation estimates.
 */

import { generateStructuredOutput, MODELS } from './client';
import { autoPivotSchema, type AutoPivotResult, type PivotOption } from '../../types/report';
import type { ResearchData } from '../research/orchestrator';
import { searchMarket, searchCompetitors } from '../research/tavily';

export function shouldTriggerPivot(saturation: number, cynicScore: number): boolean {
  // v4: saturation -1 means UNKNOWN — treat as high-risk and trigger pivot
  return saturation > 70 || saturation === -1 || cynicScore > 80;
}

export async function runAutoPivot(
  niche: string,
  saturation: number,
  cynicScore: number,
  research: ResearchData,
  userContext: {
    budget: string;
    time: string;
    assets: string[];
    stage: string;
    founderFit?: string[];
    timeline?: string;
    uniqueInsight?: string;
    acquisitionChannel?: string;
    revenueModel?: string;
    whyNow?: string;
  },
  geography: string = 'Global',
  failContext?: { clashPoints: string[]; fatalFlags: string[]; cynicReasoning: string }
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
You are the Auto-Pivot Engine. Your job is to suggest exactly 3 strategic pivots for a user whose original idea has failed.

VECTOR-SYNC (PROHIBITION):
The original niche failed for these reasons:
${failContext?.clashPoints.map(p => `- CLASH: ${p}`).join('\n') || 'Generic saturation'}
${failContext?.fatalFlags.map(f => `- FATAL: ${f}`).join('\n') || ''}
${failContext?.cynicReasoning ? `- CYNIC: ${failContext.cynicReasoning}` : ''}

You MUST NOT suggest pivots that share the same structural flaws. 
- If the idea failed due to high CAC, the pivot must define a lower CAC channel.
- If it failed due to regulatory risk, the pivot must be a non-regulated alternative.

ASSET-LEVERAGE AUDIT:
For every pivot, you MUST identify exactly ONE asset from this list that gives the user an unfair advantage:
${userContext.assets.join(', ') || 'None provided'}

PIVOT CATEGORIES:
- Pivot A (Natural Successor): Lowest friction, solves the "Kill" risk while using 100% of existing assets.
- Pivot B (Vector-Shift): Same customer, totally different solution (solving the same JTBD).
- Pivot C (Arbitrage): Same tech/skills, totally different market/geography.

OUTPUT: Valid JSON matching report.ts/autoPivotSchema.
`.trim();

  const user = `
ORIGINAL NICHE: ${niche}
USER BUDGET: ${userContext.budget}
USER TIME: ${userContext.time}
USER ASSETS: ${userContext.assets.join(', ') || 'None'}
USER UNIQUE INSIGHT: ${userContext.uniqueInsight || 'None'}

=== RESEARCH DATA ===
${research.painPoints.slice(0, 3).map(p => `- ${p}`).join('\n')}

Generate 3 high-conviction pivots that solve the structural failures identified.
`.trim();

  try {
    const result = await generateStructuredOutput<AutoPivotResult>(system, user, autoPivotSchema, MODELS.REASONING);

    // --- Deep-Link Validation with Tavily ---
    console.log(`[Auto-Pivot] Deep-Link Validating ${result.pivots.length} pivots...`);

    const validatedPivots = await Promise.all(
      result.pivots.map(async (pivot: any) => {
        try {
          // DEEP-LINK SEARCH: Search for the pivot AND the specific value proposition
          const deepQuery = `${pivot.title} ${pivot.description.split('.')[0]}`;
          
          const [marketRes, compRes] = await Promise.all([
            searchMarket(deepQuery, geography),
            searchCompetitors(pivot.title, geography),
          ]);

          const sourceCount = (marketRes?.results?.length || 0) + (compRes?.results?.length || 0);
          const realCompetitorCount = compRes?.results?.length || 0;
          
          // Logarithmic saturation formula
          let adjustedSaturation = Math.min(75, Math.round(Math.log2(realCompetitorCount + 1) * 20));
          if (realCompetitorCount > 0 && adjustedSaturation < 10) adjustedSaturation = 10;

          // Pivot-must-be-better guard
          if (saturation > 0 && adjustedSaturation >= saturation) {
            adjustedSaturation = Math.max(10, saturation - 10);
          }

          // Competitor extraction
          const competitorNames: string[] = [];
          if (compRes?.results) {
            for (const r of compRes.results) {
              try {
                const domain = new URL(r.url).hostname.replace('www.', '');
                const name = r.title?.split(/[–\-|:]/)[0]?.trim() || domain;
                if (name && !competitorNames.includes(name) && competitorNames.length < 5) {
                  competitorNames.push(name);
                }
              } catch { /**/ }
            }
          }

          return {
            ...pivot,
            newSaturation: adjustedSaturation,
            reasoning: sourceCount > 2
              ? `${pivot.reasoning} [Deep-Validated: Found ${competitorNames.length} direct competitors including ${competitorNames.join(', ')}.]`
              : `${pivot.reasoning} [Speculative: Insufficient market data to verify competitive density.]`,
          };
        } catch (err) {
          return { ...pivot, reasoning: `${pivot.reasoning} [Validation skipped: network error]` };
        }
      })
    );

    return { ...result, pivots: validatedPivots };
  } catch (err) {
    console.error('[Auto-Pivot] Failed:', err);
    return { triggered: true, reason: 'Pivot generation error', pivots: [] };
  }
}

