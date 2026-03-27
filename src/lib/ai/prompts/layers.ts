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
  if (!data.length) return 'No research data available for this section.';
  return data.map((d, i) => `[Source ${i + 1}]: ${d}`).join('\n\n');
}

// ========== LAYER 1 — AUDIENCE INTELLIGENCE ==========

export function layer1Prompt(niche: string, geo: string, research: { painPoints: string[]; competitors: string[] }) {
  const system = `
You are the Audience Intelligence module of a world-class market analysis engine.
Your job is to deliver a rigorous, citation-backed analysis of the target audience for a specific niche.

OUTPUT FORMAT: Valid JSON matching the schema below (no markdown, no backticks).
Every claim must have a "confidence" field: "high", "medium", or "low".
Every claim should cite its source when possible.
Include a "notFound" array listing anything you couldn't determine.

JSON Schema keys expected:
painPoints[], buyerLanguage[], purchaseTriggers[], avatar{}, hiddenObjections[],
desiresAndDreams[], shadowAvatar{}, paymentThreshold{}, notFound[]
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

OUTPUT FORMAT: Valid JSON. Every numeric range must include sources and confidence level.
Include a "notFound" array for gaps.

JSON Schema keys expected:
tam{}, sam{}, som{}, trendTrajectory{}, internationalOpportunity{}, adjacentMarkets[],
marketTimingVerdict, sentimentVelocity{}, notFound[]
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
  userContext: { budget: string; time: string; assets: string[] }
) {
  const system = `
You are the Survival Intelligence module — the adversarial risk detector.
Your job is to identify every threat that could kill this idea.
Name specific AI models, specific platforms, specific competitors.
Cross-reference the user's budget and skills against execution difficulty.

OUTPUT FORMAT: Valid JSON with confidence scoring and source citations.
Include a "notFound" array.

JSON Schema keys expected:
dyingTrendSignals[], aiDisruptionRisk{}, platformDependency{}, saturationScore{},
legalMatrix[], gorillaCompetitors[], executionDifficulty{}, scenarioSimulator[], notFound[]
`.trim();

  const user = `
NICHE: ${niche}
GEOGRAPHY: ${geo}
USER BUDGET: ${userContext.budget}
USER TIME: ${userContext.time}
USER ASSETS: ${userContext.assets.join(', ') || 'None specified'}

=== RESEARCH DATA ===
${researchBlock([...research.trends, ...research.regulations, ...research.competitors])}

Be ruthlessly honest. Name the specific AI model that threatens this niche.
Score saturation 0-100. Score execution difficulty 0-100 against this specific user's resources.
`.trim();

  return { system, user };
}

// ========== LAYER 4 — COMPETITOR INTELLIGENCE ==========

export function layer4Prompt(niche: string, research: { competitors: string[] }) {
  const system = `
You are the Competitor Intelligence module. Produce deep profiles of the top competitors,
identify market gaps, SEO white space, pricing spectrum, substitute threats, and competitor velocity.

OUTPUT FORMAT: Valid JSON with sources. Include "notFound" array.

JSON Schema keys expected:
competitors[], marketGaps[], seoWhiteSpace[], pricingSpectrum{}, substituteThreats[],
competitorVelocity[], notFound[]
`.trim();

  const user = `
NICHE: ${niche}

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
  userContext: { budget: string; time: string }
) {
  const system = `
You are the Unit Economics module. Calculate CAC benchmarks, LTV estimates, LTV:CAC verdict,
break-even timeline, burn rate scenarios using the user's actual budget, and optimal price point.

OUTPUT FORMAT: Valid JSON. Use ranges where uncertain. Include confidence and sources.
Include "notFound" array.

JSON Schema keys expected:
cacBenchmark{}, ltvBenchmark{}, ltvCacVerdict{}, breakEven{}, burnRateScenarios[],
optimalPricePoint{}, notFound[]
`.trim();

  const user = `
NICHE: ${niche}
USER BUDGET: ${userContext.budget}
USER TIME: ${userContext.time}

=== RESEARCH DATA ===
${researchBlock([...research.marketSize, ...research.competitors])}

Use the user's actual budget for burn rate scenarios. Be specific about assumptions.
`.trim();

  return { system, user };
}

// ========== LAYER 6 — OFFER & GTM ==========

export function layer6Prompt(
  niche: string,
  geo: string,
  research: { marketSize: string[]; competitors: string[]; painPoints: string[] },
  userContext: { budget: string; time: string; assets: string[] }
) {
  const system = `
You are the Offer & GTM module. Generate concrete offer ideas with pricing logic,
a week-by-week GTM plan, platform-specific hooks, channel map with decay signals,
validation roadmap with costs, future trends, distribution leverage, and revenue model fit.

OUTPUT FORMAT: Valid JSON. Include confidence per offer. Include "notFound" array.

JSON Schema keys expected:
offerIdeas[], gtmPlan[], platformHooks[], channelMap[], validationRoadmap[],
futureTrends[], distributionLeverage[], revenueModelFit[], notFound[]
`.trim();

  const user = `
NICHE: ${niche}
GEOGRAPHY: ${geo}
USER BUDGET: ${userContext.budget}
USER TIME: ${userContext.time}
USER ASSETS: ${userContext.assets.join(', ') || 'None specified'}

=== RESEARCH DATA ===
${researchBlock([...research.marketSize, ...research.competitors, ...research.painPoints])}

GTM plan should be personalised to the user's budget and time commitment.
Include specific costs for each validation step.
`.trim();

  return { system, user };
}

// ========== LAYER 7 — ANTI-COMMODITISATION (MOAT) ==========

export function layer7Prompt(niche: string, research: { competitors: string[] }) {
  const system = `
You are the Anti-Commoditisation module. For the given niche, generate 6 moat strategies:
data advantage, workflow deep-integration, network effect, regulatory moat,
community moat, and switching cost architecture.

Each moat must include: type, strategy, implementation steps, and time to effect.

OUTPUT FORMAT: Valid JSON. Include "notFound" array.
JSON Schema keys expected: moats[], notFound[]
`.trim();

  const user = `
NICHE: ${niche}

=== RESEARCH DATA ===
${researchBlock(research.competitors)}

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
Generate the following 5 specialised modules tailored to their archetype:
${modules.map((m, i) => `${i + 1}. ${m}`).join('\n')}

Each module must include: title, content (detailed analysis), confidence level, and source citations.

OUTPUT FORMAT: Valid JSON. Include "notFound" array.
JSON Schema keys expected: modules[], notFound[]
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
