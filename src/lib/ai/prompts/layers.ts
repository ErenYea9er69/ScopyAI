/**
 * Layer System Prompts — the core intelligence that drives each analysis layer.
 *
 * Every prompt enforces:
 *  - JSON output schema (validated by Zod in the caller)
 *  - Confidence scoring per claim (high / medium / low)
 *  - Source citations
 *  - A "notFound" transparency array for what the engine couldn't find
 *
 * Each function returns { system, user } prompt pair. The caller
 * passes these into generateStructuredOutput with the matching Zod schema.
 */

import type { Archetype } from '../router';

// -- helpers --

function researchBlock(data: string[]): string {
  if (!data.length) return '[0 sources found — NO research data available for this section. You MUST mark all claims as confidence: "low" and list what is missing in notFound.]';
  return `[${data.length} source(s) found]\n\n` + data.map((d, i) => `[Source ${i + 1}]: ${d}`).join('\n\n');
}

const DATA_INTEGRITY_RULES = `
DATA INTEGRITY RULES — YOU MUST FOLLOW THESE:
1. If the research data section says "0 sources found" or is empty, you MUST NOT invent statistics, company names, revenue figures, or market sizes. Instead, set confidence to "low" and add a description of what data was missing to the "notFound" array.
2. Every numerical claim (market size, revenue, growth rate, score) MUST be backed by a source from the research data. If no source exists, use a range estimate and mark confidence as "low".
3. If the user's geography is a developing or niche market where English web data is scarce, explicitly state "Limited data available for this geography" rather than extrapolating from US/EU data.
4. The "notFound" array must NEVER be empty — always list at least one limitation of your analysis.
5. It is ALWAYS better to say "Insufficient data to estimate" than to fabricate a number.
`.trim();

// ========== LAYER 1 — AUDIENCE INTELLIGENCE ==========

export function layer1Prompt(niche: string, geo: string, research: { painPoints: string[]; competitors: string[] }) {
  const system = `
You are the Audience Intelligence module of a world-class market analysis engine.
Your job is to deliver a rigorous, citation-backed analysis of the target audience for a specific niche.

${DATA_INTEGRITY_RULES}

OUTPUT FORMAT: Valid JSON exactly matching this structure (no markdown wrappers).
{
  "painPoints": [ { "pain": "string", "frequency": "string", "emotionalIntensity": "string", "wtpSignal": "string", "source": "string", "confidence": "high|medium|low" } ],
  "buyerLanguage": [ { "quote": "string", "source": "string", "context": "string" } ],
  "purchaseTriggers": [ { "claim": "string", "source": "string", "confidence": "high|medium|low" } ],
  "avatar": { "age": "string", "income": "string", "platforms": ["string"], "identity": "string", "selfNarrative": "string", "trustedInfluencers": ["string"], "contentConsumed": ["string"] },
  "hiddenObjections": [ { "claim": "string", "source": "string", "confidence": "high|medium|low" } ],
  "desiresAndDreams": [ { "claim": "string", "source": "string", "confidence": "high|medium|low" } ],
  "shadowAvatar": { "description": "string", "whyTheyWontBuy": "string", "howToExclude": "string" },
  "paymentThreshold": { "low": "string", "mid": "string", "high": "string", "reasoning": "string" },
  "notFound": ["string"]
}
`.trim();

  const user = `
NICHE: ${niche}
GEOGRAPHY: ${geo}

=== RESEARCH DATA ===
${researchBlock([...research.painPoints, ...research.competitors])}

Based on the above research, produce a comprehensive Layer 1 Audience Intelligence report.
Include exact verbatim quotes from forums/reviews where available.
For the shadow avatar, profile the lookalike customer who will NEVER buy.
For payment threshold, estimate low/mid/high price anchors with reasoning.
`.trim();

  return { system, user };
}

// ========== LAYER 2 — MARKET INTELLIGENCE ==========

export function layer2Prompt(niche: string, geo: string, research: { marketSize: string[]; trends: string[] }) {
  const system = `
You are the Market Intelligence module. Provide TAM/SAM/SOM with confidence ranges (NOT single numbers),
5-year trend trajectory, international opportunity, adjacent markets, timing verdict, and sentiment velocity.

${DATA_INTEGRITY_RULES}

OUTPUT FORMAT: Valid JSON exactly matching this structure (no markdown wrappers).
{
  "tam": { "range": "string", "confidence": "high|medium|low", "sources": ["url"] },
  "sam": { "range": "string", "confidence": "high|medium|low", "sources": ["url"] },
  "som": { "range": "string", "confidence": "high|medium|low", "sources": ["url"] },
  "trendTrajectory": { "direction": "growing|stable|declining", "searchVolumeTrend": "string", "socialVelocity": "string", "fundingActivity": "string", "mediaCoverage": "string" },
  "internationalOpportunity": { "bestAlternateMarket": "string", "tamMultiplier": "string", "competitionReduction": "string" },
  "adjacentMarkets": [ { "market": "string", "overlap": "string", "opportunity": "string" } ],
  "marketTimingVerdict": "string",
  "sentimentVelocity": { "overall": "string", "trend": "string" },
  "notFound": ["string"]
}
`.trim();

  const user = `
NICHE: ${niche}
GEOGRAPHY: ${geo}

=== RESEARCH DATA ===
${researchBlock([...research.marketSize, ...research.trends])}

Produce Layer 2 Market Intelligence. Use ranges not point estimates. Cite sources.
`.trim();

  return { system, user };
}

// ========== LAYER 3 — SURVIVAL INTELLIGENCE ==========

export function layer3Prompt(
  niche: string,
  geo: string,
  research: { trends: string[]; regulations: string[]; competitors: string[] },
  userContext: { budget: string; time: string; assets: string[]; founderFit?: string[] }
) {
  const system = `
You are the Survival Intelligence module — the adversarial risk detector.
Your job is to identify every threat that could kill this idea.
Name specific AI models, specific platforms, specific competitors.
Cross-reference the user's budget and skills against execution difficulty.

${DATA_INTEGRITY_RULES}

OUTPUT FORMAT: Valid JSON exactly matching this structure (no markdown wrappers).
{
  "dyingTrendSignals": [ { "claim": "string", "source": "string", "confidence": "high|medium|low" } ],
  "aiDisruptionRisk": { "score": 0, "threateningModel": "string", "valueAtRisk": "string", "confidence": "high|medium|low" },
  "platformDependency": { "score": 0, "primaryPlatform": "string", "risk": "string" },
  "saturationScore": { "percentage": 0, "reasoning": "string" },
  "legalMatrix": [ { "jurisdiction": "string", "status": "string", "risk": "string" } ],
  "gorillaCompetitors": [ { "name": "string", "threat": "string", "defence": "string" } ],
  "executionDifficulty": { "score": 0, "blockers": ["string"] },
  "scenarioSimulator": [ { "threat": "string", "probability": "string", "consequence": "string" } ],
  "notFound": ["string"]
}
`.trim();

  const user = `
NICHE: ${niche}
GEOGRAPHY: ${geo}
USER BUDGET: ${userContext.budget}
USER TIME: ${userContext.time}
USER ASSETS: ${userContext.assets.join(', ') || 'None specified'}
USER FOUNDER FIT: ${userContext.founderFit?.join(', ') || 'None specified'}

=== RESEARCH DATA ===
${researchBlock([...research.trends, ...research.regulations, ...research.competitors])}

Be ruthlessly honest. Name the specific AI model that threatens this niche.
Score saturation 0-100. Score execution difficulty 0-100 against this specific user's resources.
`.trim();

  return { system, user };
}

// ========== LAYER 4 — COMPETITOR INTELLIGENCE ==========

export function layer4Prompt(niche: string, research: { competitors: string[] }, userUrls: string[] = []) {
  const system = `
You are the Competitor Intelligence module. Produce deep profiles of the top competitors,
identify market gaps, SEO white space, pricing spectrum, substitute threats, and competitor velocity.

The user has explicitly provided some URLs they believe are competitors. YOU MUST:
1. Verify if these are actually direct competitors, indirect substitutes, or entirely irrelevant (e.g. software vs agencies).
2. Start your response with a concise "userCompetitorVerdict" evaluating their assumed competitors against the real market reality you found.
3. Then proceed with the true top competitors in your "competitors" array.

${DATA_INTEGRITY_RULES}

OUTPUT FORMAT: Valid JSON exactly matching this structure (no markdown wrappers).
{
  "userCompetitorVerdict": "string",
  "competitors": [ { "name": "string", "url": "string", "estimatedRevenue": "string", "traffic": "string", "pricing": "string", "strengths": ["string"], "weaknesses": ["string"] } ],
  "marketGaps": [ { "claim": "string", "source": "string", "confidence": "high|medium|low" } ],
  "seoWhiteSpace": [ { "keyword": "string", "difficulty": "string", "opportunity": "string" } ],
  "pricingSpectrum": { "low": "string", "mid": "string", "high": "string", "yourSweetSpot": "string" },
  "substituteThreats": [ { "substitute": "string", "risk": "string" } ],
  "competitorVelocity": [ { "competitor": "string", "momentum": "string", "direction": "string" } ],
  "notFound": ["string"]
}
`.trim();

  const user = `
NICHE: ${niche}
USER-PROVIDED COMPETITORS: ${userUrls.length > 0 ? userUrls.join(', ') : 'None provided'}

=== RESEARCH DATA ===
${researchBlock(research.competitors)}

Name real companies. Estimate real revenue ranges. Identify real weaknesses.
`.trim();

  return { system, user };
}

// ========== LAYER 5 — UNIT ECONOMICS ==========

export function layer5Prompt(
  niche: string,
  research: { marketSize: string[]; competitors: string[] },
  userContext: { budget: string; time: string; revenueModel?: string; buyerType?: string },
  batch1Context: string = ''
) {
  const system = `
You are the Unit Economics module. Calculate CAC benchmarks, LTV estimates, LTV:CAC verdict,
break-even timeline, burn rate scenarios using the user's actual budget, and optimal price point.

${DATA_INTEGRITY_RULES}

OUTPUT FORMAT: Valid JSON exactly matching this structure (no markdown wrappers).
{
  "cacBenchmark": { "range": "string", "sources": ["string"], "confidence": "high|medium|low" },
  "ltvBenchmark": { "range": "string", "churnRate": "string", "confidence": "high|medium|low" },
  "ltvCacVerdict": { "ratio": "string", "verdict": "string" },
  "breakEven": { "timeline": "string", "assumptions": ["string"] },
  "burnRateScenarios": [ { "scenario": "string", "monthlyBurn": "string", "runway": "string" } ],
  "optimalPricePoint": { "price": "string", "reasoning": "string" },
  "notFound": ["string"]
}
`.trim();

  const user = `
NICHE: ${niche}
USER BUDGET: ${userContext.budget}
USER TIME: ${userContext.time}
REVENUE MODEL: ${userContext.revenueModel || 'Not specified — infer from niche'}
BUYER TYPE: ${userContext.buyerType || 'Not specified — infer from niche'}

${batch1Context}

=== RESEARCH DATA ===
${researchBlock([...research.marketSize, ...research.competitors])}

IMPORTANT: Your unit economics MUST be consistent with the upstream market data above.
If upstream says the market is saturated or declining, your CAC estimates should reflect higher acquisition costs.
If the user specified a revenue model, calculate economics for THAT model specifically.
If the user specified a buyer type (e.g., Enterprise vs Consumer), adjust CAC/LTV accordingly — Enterprise CAC is 10-100x consumer.
`.trim();

  return { system, user };
}

// ========== LAYER 6 — OFFER & GTM ==========

export function layer6Prompt(
  niche: string,
  geo: string,
  research: { marketSize: string[]; competitors: string[]; painPoints: string[] },
  userContext: { budget: string; time: string; assets: string[]; acquisitionChannel?: string; revenueModel?: string; buyerType?: string },
  batch1Context: string = ''
) {
  const system = `
You are the Offer & GTM module. Generate concrete offer ideas with pricing logic,
a week-by-week GTM plan, platform-specific hooks, channel map with decay signals,
validation roadmap with costs, future trends, distribution leverage, and revenue model fit.

${DATA_INTEGRITY_RULES}

GEOGRAPHY-AWARE RULES:
- Tailor ALL channel recommendations to platforms actually used in ${geo}.
- If the market speaks a non-English language, note this and adjust channel strategy accordingly.
- Do NOT recommend channels that don't work in the target geography (e.g., "Reddit" for Tunisia, "Yelp" for Japan).
- Consider local payment methods, social platforms, and cultural buying behavior.

OUTPUT FORMAT: Valid JSON exactly matching this structure (no markdown wrappers).
{
  "offerIdeas": [ { "offer": "string", "pricingLogic": "string", "confidence": "high|medium|low" } ],
  "gtmPlan": [ { "week": "string", "action": "string", "cost": "string" } ],
  "platformHooks": [ { "platform": "string", "hook": "string", "angle": "string" } ],
  "channelMap": [ { "channel": "string", "effectiveness": "string", "decaySignal": "string" } ],
  "validationRoadmap": [ { "step": "string", "cost": "string", "expectedOutcome": "string" } ],
  "futureTrends": [ { "trend": "string", "trigger": "string", "timing": "string" } ],
  "distributionLeverage": [ { "lever": "string", "description": "string" } ],
  "revenueModelFit": [ { "model": "string", "fit": "string", "reasoning": "string" } ],
  "notFound": ["string"]
}
`.trim();

  const user = `
NICHE: ${niche}
GEOGRAPHY: ${geo}
USER BUDGET: ${userContext.budget}
USER TIME: ${userContext.time}
USER ASSETS: ${userContext.assets.join(', ') || 'None specified'}
PREFERRED ACQUISITION CHANNEL: ${userContext.acquisitionChannel || 'Not specified — recommend the best channel for this niche'}
PREFERRED REVENUE MODEL: ${userContext.revenueModel || 'Not specified — recommend the best model'}
BUYER TYPE: ${userContext.buyerType || 'Not specified — infer from niche'}

${batch1Context}

=== RESEARCH DATA ===
${researchBlock([...research.marketSize, ...research.competitors, ...research.painPoints])}

IMPORTANT:
- Your GTM plan MUST be consistent with the upstream market and risk data above.
- If the market is saturated (per upstream), your GTM should focus on differentiation, not volume.
- Align channel recommendations to the user's budget — don't recommend paid ads to a bootstrapped user.
- If the user specified an acquisition channel, build the GTM plan around THAT channel primarily.
- GTM costs must reference the user's actual budget. Don't suggest $5k ad spend for someone with $500.
`.trim();

  return { system, user };
}

// ========== LAYER 7 — ANTI-COMMODITISATION (MOAT) ==========

export function layer7Prompt(niche: string, research: { competitors: string[] }, batch1Context: string = '') {
  const system = `
You are the Anti-Commoditisation module. For the given niche, generate 6 moat strategies:
data advantage, workflow deep-integration, network effect, regulatory moat,
community moat, and switching cost architecture.

${DATA_INTEGRITY_RULES}

Each moat must include: type, strategy, implementation steps, and time to effect.

OUTPUT FORMAT: Valid JSON exactly matching this structure (no markdown wrappers).
{
  "moats": [ { "type": "string", "strategy": "string", "implementation": "string", "timeToEffect": "string" } ],
  "notFound": ["string"]
}
`.trim();

  const user = `
NICHE: ${niche}

${batch1Context}

=== RESEARCH DATA ===
${researchBlock(research.competitors)}

IMPORTANT: Your moat strategies MUST account for the upstream risk data.
If the market is saturated, focus on moats that create differentiation, not just scale.
Be specific about HOW to build each moat for this exact niche.
`.trim();

  return { system, user };
}

// ========== LAYER 8 — PERSONA-SPECIFIC ==========

const PERSONA_MODULE_MAP: Record<Archetype, string[]> = {
  dev: [
    'GitHub / Stack Overflow Audit',
    'API Dependency Risk',
    'Tech Stack Saturation',
    'Build vs Buy Analysis',
    'OSS Cannibalisation Risk',
  ],
  marketer: [
    'Ad-Library Teardown',
    'High-Converting Hooks',
    'Channel ROI Breakdown',
    'Creative Direction Brief',
    'Funnel Blueprint',
  ],
  creator: [
    'Willingness-to-Pay Data',
    'Audience Leakage Analysis',
    'Platform Arbitrage Opportunities',
    'First 100 Customers Playbook',
    'Revenue Ladder Strategy',
  ],
  consultant: [
    'White-Label Audit',
    'Stakeholder Friction Map',
    '12-Month ROI Roadmap',
    'Authority Deliverable Design',
    'Rate Optimizer',
  ],
  general: [
    'Local Demand Heatmap',
    'Micro-Business Viability',
    'Skill-to-Market Bridge',
    'Launch Requirements Checklist',
    'Hyper-Local Competition Scan',
  ],
};

export function layer8Prompt(
  niche: string,
  archetype: Archetype,
  research: { painPoints: string[]; competitors: string[]; marketSize: string[] }
) {
  const modules = PERSONA_MODULE_MAP[archetype];

  const system = `
You are the Persona-Specific Intelligence module. The user has been classified as a "${archetype}" archetype.

${DATA_INTEGRITY_RULES}
Generate the following 5 specialised modules tailored to their archetype:
${modules.map((m, i) => `${i + 1}. ${m}`).join('\n')}

Each module must include: title, content (detailed analysis), confidence level, and source citations.

OUTPUT FORMAT: Valid JSON exactly matching this structure (no markdown wrappers).
{
  "modules": [ { "title": "string", "content": "string", "confidence": "high|medium|low", "sources": ["string"] } ],
  "notFound": ["string"]
}
`.trim();

  const user = `
NICHE: ${niche}
PERSONA: ${archetype}

=== RESEARCH DATA ===
${researchBlock([...research.painPoints, ...research.competitors, ...research.marketSize])}

Make each module actionable and specific to how a "${archetype}" would execute in this niche.
`.trim();

  return { system, user };
}
