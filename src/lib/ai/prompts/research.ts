import { z } from 'zod';

/**
 * Prompt 1: Semantic Query Expansion
 * Turns a raw user niche and insight into a 6-dimensional research plan.
 */
export const queryPlanSchema = z.object({
  marketSizeQueries: z.array(z.string()).default([]),
  competitorQueries: z.array(z.string()).default([]),
  painPointQueries: z.array(z.string()).default([]),
  trendQueries: z.array(z.string()).default([]),
  regulationQueries: z.array(z.string()).default([]),
  unitEconomicsQueries: z.array(z.string()).default([]),
});

export function queryExpansionPrompt(niche: string, geography: string, uniqueInsight: string, whyNow: string) {
  return {
    system: `You are the ScopyAI "Research Planner" agent.
Your goal is to break down a business niche into high-intent search queries that will yield deep, non-obvious data.

You must generate exactly 2-3 queries for each category:
1. MARKET: Sizing, TAM/SAM, growth.
2. COMPETITORS: Alternatives, indirect threats, pricing.
3. PAIN POINTS: Forum discussions, customer complaints, Reddit/Quora search terms.
4. TRENDS: Dying vs. rising signals, technological shifts.
5. REGULATIONS: Legal risks, compliance, barriers.
6. ECONOMICS: CAC, LTV, pricing benchmarks for this vertical.

Focus heavily on the user's UNIQUE INSIGHT and "WHY NOW" signals to bias the search towards specific opportunities.

OUTPUT: Valid JSON with these keys (each an array of strings):
marketSizeQueries, competitorQueries, painPointQueries, trendQueries, regulationQueries, unitEconomicsQueries`,
    user: `NICHE: ${niche}
GEOGRAPHY: ${geography}
UNIQUE INSIGHT: ${uniqueInsight}
WHY NOW: ${whyNow}

Generate a comprehensive research plan JSON.`
  };
}

/**
 * Prompt 2: Source Relevance Filter
 * Scores a search snippet for semantic relevance.
 */
export const relevanceSchema = z.object({
  relevanceScore: z.coerce.number().min(0).max(10).default(5),
  reasoning: z.string().default('No reasoning provided'),
  shouldKeep: z.boolean().default(true),
});

export function sourceRelevancePrompt(snippet: string, goal: string) {
  return {
    system: `You are the "Research Auditor" agent. 
Evaluate a search result snippet for its ability to actually answer a business research goal.
Ignore generic SEO spam, landing pages with no data, or irrelevant "best X of 2024" listicles unless they contain actual data points.

OUTPUT: Valid JSON with exactly these keys:
- relevanceScore: number 0-10 (10 = perfectly relevant)
- reasoning: string (1 sentence)
- shouldKeep: boolean`,
    user: `RESEARCH GOAL: ${goal}
SEARCH SNIPPET: ${snippet}

Return a relevance score and reasoning JSON.`
  };
}

/**
 * Prompt 3: Competitor Detective
 * Extracts competitors and their status from a batch of search results.
 */
export const competitorStatusSchema = z.object({
  competitors: z.array(z.object({
    name: z.string(),
    status: z.enum(['active', 'defunct', 'acquired', 'pivoted']).default('active'),
    confidence: z.coerce.number().min(0).max(100).default(50),
    evidence: z.string().default('No direct evidence found'),
  })).default([]),
});

export function competitorDetectivePrompt(context: string) {
  return {
    system: `You are the "Competitor Analyst" agent.
Extract competitor names and their current operational status from the provided text.
Look for shutdown signals: "ceased operations", "bankrupt", "acquired by", "no longer active".

OUTPUT: Valid JSON with key "competitors" (array of objects with: name, status, confidence, evidence).
- status must be one of: "active", "defunct", "acquired", "pivoted"
- confidence: number 0-100
- evidence: string describing why you think this`,
    user: `SEARCH CONTEXT:
${context}

Identify competitors and their status JSON.`
  };
}

/**
 * Prompt 4: Research Gap Analysis
 * Analyzes gathered snippets to identify missing information and generate new queries.
 */
export const gapAnalysisSchema = z.object({
  foundInsights: z.array(z.string()).default([]),
  missingInformation: z.array(z.string()).default([]),
  newQueries: z.array(z.string()).default([]),
  depthScore: z.coerce.number().min(0).max(10).default(5),
});

export function gapAnalysisPrompt(niche: string, context: string) {
  return {
    system: `You are the "Adversarial Research Lead".
Your job is to look at the current results for a niche and find where the data is thin, contradictory, or missing.
Analyze the provided context and determine if we have enough "Level 2" (deep) evidence.
If not, generate 3-5 highly specific "Long-tail" search queries to fill those gaps.

OUTPUT: Valid JSON with these keys:
- foundInsights: array of strings (what we found)
- missingInformation: array of strings (what's missing)
- newQueries: array of strings (new search queries)
- depthScore: number 0-10 (10 = fully researched)`,
    user: `NICHE: ${niche}
CURRENT DATA CONTEXT:
${context}

Analyze the depth of our research. Generate a gap analysis and new queries if depth is < 7 JSON.`
  };
}
