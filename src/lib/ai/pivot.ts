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
  geography: string = 'Global'
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

Pivot A (Best Fit): Lowest saturation + best match for user's skills/budget/assets/unique insight.
Pivot B (Alternate Market): Same core idea but different geography or vertical with less competition.
Pivot C (High Friction): Highest potential but requires significantly more resources or expertise than the user currently has.

Each pivot must include:
- rank ("A", "B", "C")
- title (the pivot niche/idea — MUST be 2-5 words, e.g. "AI Nutrition Coaching", NOT a full sentence)
- description (why this pivot works)
- newSaturation (estimated %, must be lower than original)
- executionFit ("Easy", "Moderate", "Hard", or "Impossible" for THIS user)
- reasoning (1-2 sentences)

Also include:
- triggered: true
- reason: why the pivot was triggered

OUTPUT: Valid JSON exactly matching this structure (no markdown wrappers):
{
  "triggered": true,
  "reason": "string",
  "pivots": [
    {
      "rank": "A|B|C",
      "title": "string",
      "description": "string",
      "newSaturation": 0,
      "executionFit": "Easy|Moderate|Hard|Impossible",
      "reasoning": "string"
    }
  ]
}
`.trim();

  const user = `
ORIGINAL NICHE: ${niche}
SATURATION: ${saturation}%
CYNIC RISK SCORE: ${cynicScore}/100
USER BUDGET: ${userContext.budget}
USER TIME: ${userContext.time}
USER ASSETS: ${userContext.assets.join(', ') || 'None'}
USER STAGE: ${userContext.stage}
USER FOUNDER FIT: ${userContext.founderFit?.join(', ') || 'None'}
USER UNIQUE INSIGHT: ${userContext.uniqueInsight || 'None'}
USER GOAL TIMELINE: ${userContext.timeline || 'Not specified'}
PREFERRED ACQUISITION CHANNEL: ${userContext.acquisitionChannel || 'Not specified'}
PREFERRED REVENUE MODEL: ${userContext.revenueModel || 'Not specified'}
WHY NOW: ${userContext.whyNow || 'Not specified'}

=== RESEARCH DATA (condensed) ===
MARKET: ${research.marketSize.slice(0, 2).join(' | ')}
COMPETITORS: ${research.competitors.slice(0, 2).join(' | ')}
PAIN POINTS: ${research.painPoints.slice(0, 2).join(' | ')}
TRENDS: ${research.trends.slice(0, 2).join(' | ')}

Generate 3 pivots. Each must be concretely different from the original niche.
Pivot A must be genuinely achievable by this user within their budget and timeline.
Use the user's unique insight and founder fit to find pivots where they have an actual edge.
`.trim();

  try {
    const result = await generateStructuredOutput<AutoPivotResult>(system, user, autoPivotSchema, MODELS.REASONING);

    // --- Validate pivots with Tavily ---
    console.log(`[Auto-Pivot] Validating ${result.pivots.length} pivot ideas with Tavily...`);

    const validatedPivots = await Promise.all(
      result.pivots.map(async (pivot: any) => {
        try {
          const [marketRes, compRes] = await Promise.all([
            searchMarket(pivot.title, geography),
            searchCompetitors(pivot.title, geography),
          ]);

          const sourceCount = (marketRes?.results?.length || 0) + (compRes?.results?.length || 0);
          const hasRealData = sourceCount > 2;

          // v3: Logarithmic saturation formula — prevents always-95% outputs
          // log2(1)=0, log2(2)=1, log2(4)=2, log2(8)=3
          // 0 competitors → 0%, 1 → 13%, 2 → 20%, 3 → 25%, 4 → 29%, 7 → 38%, 10+ → capped 75%
          const realCompetitorCount = compRes?.results?.length || 0;
          let adjustedSaturation: number;
          
          if (hasRealData) {
            adjustedSaturation = Math.min(75, Math.round(Math.log2(realCompetitorCount + 1) * 25));
            // Floor at 10% if we found any competitors
            if (realCompetitorCount > 0 && adjustedSaturation < 10) adjustedSaturation = 10;
          } else {
            adjustedSaturation = pivot.newSaturation; // Keep LLM estimate if no data
          }

          // v4: Pivot-must-be-better guard — reject pivots with higher saturation than original
          // Skip guard if original saturation is unknown (0 or -1)
          if (saturation > 0 && adjustedSaturation >= saturation) {
            console.warn(`[Auto-Pivot] Pivot "${pivot.title}" saturation (${adjustedSaturation}%) is >= original (${saturation}%). Capping at ${saturation - 5}%.`);
            adjustedSaturation = Math.max(10, saturation - 5);
          }

          // v5: Extract actual competitor NAMES from results
          const competitorNames: string[] = [];
          if (compRes?.results) {
            for (const r of compRes.results) {
              // Extract domain name as competitor identifier
              try {
                const domain = new URL(r.url).hostname.replace('www.', '');
                const name = r.title?.split(/[–\-|:]/)[0]?.trim() || domain;
                if (name && !competitorNames.includes(name) && competitorNames.length < 7) {
                  competitorNames.push(name);
                }
              } catch { /* skip invalid URLs */ }
            }
          }

          // v5: Budget compatibility check
          const COMPLEXITY_SIGNALS = ['api', 'hardware', 'sensor', 'cgm', 'medical', 'regulatory', 'clinical', 'device'];
          const pivotLower = pivot.title.toLowerCase() + ' ' + pivot.description.toLowerCase();
          const hasComplexity = COMPLEXITY_SIGNALS.some(kw => pivotLower.includes(kw));
          const budgetCompatible = !hasComplexity; // If no complexity signals, budget-compatible

          return {
            ...pivot,
            newSaturation: adjustedSaturation,
            reasoning: hasRealData
              ? `${pivot.reasoning} [Validated: ${sourceCount} sources. Named competitors: ${competitorNames.length > 0 ? competitorNames.join(', ') : 'none identified'}. Budget compatible: ${budgetCompatible ? 'YES' : 'NO — contains hardware/API/regulatory dependencies'}]`
              : `${pivot.reasoning} [Unvalidated: insufficient Tavily data to confirm]`,
          };
        } catch (err) {
          console.warn(`[Auto-Pivot] Validation failed for "${pivot.title}":`, err);
          return {
            ...pivot,
            reasoning: `${pivot.reasoning} [Validation skipped due to search error]`,
          };
        }
      })
    );

    return {
      ...result,
      pivots: validatedPivots,
    };
  } catch (err) {
    console.error('[Auto-Pivot] Failed to generate pivots:', err);
    return {
      triggered: true,
      reason: `Saturation=${saturation}%, Cynic=${cynicScore}/100, but pivot generation failed.`,
      pivots: [],
    };
  }
}

