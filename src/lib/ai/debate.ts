/**
 * Tri-Agent Debate System
 *
 * Three independent AI agents evaluate the same niche + research data:
 *   Builder  → opportunity maximiser (GO / CAUTION)
 *   Cynic    → risk destroyer (KILL / PIVOT / GO)
 *   Operator → execution reality check (EASY / HARD / IMPOSSIBLE)
 *
 * The Debate Resolver weighs all three and produces a conditional verdict.
 */

import { generateStructuredOutput, MODELS } from './client';
import { agentVerdictSchema, debateResultSchema, type DebateResult } from '@/types/report';
import type { ResearchData } from '@/lib/research/orchestrator';

function researchSummary(research: ResearchData): string {
  return [
    '--- MARKET DATA ---',
    research.marketSize.slice(0, 3).join('\n'),
    '--- COMPETITOR DATA ---',
    research.competitors.slice(0, 3).join('\n'),
    '--- PAIN POINT DATA ---',
    research.painPoints.slice(0, 3).join('\n'),
    '--- TREND DATA ---',
    research.trends.slice(0, 3).join('\n'),
    '--- REGULATORY DATA ---',
    research.regulations.slice(0, 2).join('\n'),
  ].join('\n\n');
}

// ========== BUILDER AGENT ==========

async function runBuilder(niche: string, research: ResearchData) {
  const system = `
You are The Builder — the opportunity maximiser agent in a tri-agent debate.
Your role is to find EVERY reason this idea could succeed.
Score opportunity 0–100. Highlight demand signals, market gaps, timing advantages.
Return a signal: "GO" or "CAUTION" with reasoning.

OUTPUT: Valid JSON exactly matching this structure (no markdown wrappers):
{
  "score": 0,
  "signal": "GO|CAUTION",
  "reasoning": "string",
  "keyPoints": ["string"]
}
`.trim();

  const user = `
NICHE: ${niche}

${researchSummary(research)}

Find the strongest possible case for building in this niche. Be specific.
`.trim();

  return generateStructuredOutput(system, user, agentVerdictSchema, MODELS.REASONING);
}

// ========== CYNIC AGENT ==========

async function runCynic(niche: string, research: ResearchData) {
  const system = `
You are The Cynic — the adversarial risk destroyer in a tri-agent debate.
Your role is to find EVERY reason this idea will fail.
Score risk 0–100 (100 = maximum danger). Highlight moat weakness, AI disruption, saturation.
Return a signal: "KILL", "PIVOT", or "GO" with reasoning.

OUTPUT: Valid JSON exactly matching this structure (no markdown wrappers):
{
  "score": 0,
  "signal": "KILL|PIVOT|GO",
  "reasoning": "string",
  "keyPoints": ["string"]
}
`.trim();

  const user = `
NICHE: ${niche}

${researchSummary(research)}

Be ruthless. Name specific threats. Assume the worst case.
`.trim();

  return generateStructuredOutput(system, user, agentVerdictSchema, MODELS.REASONING);
}

// ========== OPERATOR AGENT ==========

async function runOperator(
  niche: string,
  research: ResearchData,
  userContext: { budget: string; time: string; assets: string[]; stage: string; founderFit?: string[] }
) {
  const system = `
You are The Operator — the execution reality-check agent in a tri-agent debate.
You cross-reference the user's actual budget, skills, timeline, and assets against
what it would take to execute in this niche.
Score execution difficulty 0–100 (100 = impossible for this user).
Return a signal: "EASY", "HARD", or "IMPOSSIBLE" with specific blockers.

OUTPUT: Valid JSON exactly matching this structure (no markdown wrappers):
{
  "score": 0,
  "signal": "EASY|HARD|IMPOSSIBLE",
  "reasoning": "string",
  "keyPoints": ["string"]
}
`.trim();

  const user = `
NICHE: ${niche}
USER BUDGET: ${userContext.budget}
USER TIME: ${userContext.time}
USER ASSETS: ${userContext.assets.join(', ') || 'None'}
USER STAGE: ${userContext.stage}
USER FOUNDER FIT: ${userContext.founderFit?.join(', ') || 'None'}

${researchSummary(research)}

Be honest about whether THIS SPECIFIC USER can execute. List concrete blockers.
`.trim();

  return generateStructuredOutput(system, user, agentVerdictSchema, MODELS.REASONING);
}

// ========== DEBATE RESOLVER ==========

async function resolveDebate(
  niche: string,
  builder: { score: number; signal: string; reasoning: string; keyPoints: string[] },
  cynic: { score: number; signal: string; reasoning: string; keyPoints: string[] },
  operator: { score: number; signal: string; reasoning: string; keyPoints: string[] }
) {
  const system = `
You are the Debate Resolver. You have received verdicts from three independent AI agents
evaluating the same niche. Weigh all evidence and produce a final conditional verdict.

Format: "GO if [condition]. PIVOT if [condition]. KILL if [condition] within [N] days."
Also produce a compositeScore 0-100 (weighted average of opportunity, inverse-risk, and feasibility).

OUTPUT: Valid JSON exactly matching this structure (no markdown wrappers):
{
  "builder": { "score": 0, "signal": "string", "reasoning": "string", "keyPoints": ["string"] },
  "cynic": { "score": 0, "signal": "string", "reasoning": "string", "keyPoints": ["string"] },
  "operator": { "score": 0, "signal": "string", "reasoning": "string", "keyPoints": ["string"] },
  "finalVerdict": "string",
  "compositeScore": 0
}
`.trim();

  const user = `
NICHE: ${niche}

BUILDER AGENT (Opportunity):
Score: ${builder.score}/100 — Signal: ${builder.signal}
Reasoning: ${builder.reasoning}
Key Points: ${builder.keyPoints.join('; ')}

CYNIC AGENT (Risk):
Score: ${cynic.score}/100 — Signal: ${cynic.signal}
Reasoning: ${cynic.reasoning}
Key Points: ${cynic.keyPoints.join('; ')}

OPERATOR AGENT (Execution):
Score: ${operator.score}/100 — Signal: ${operator.signal}
Reasoning: ${operator.reasoning}
Key Points: ${operator.keyPoints.join('; ')}

Weigh all three perspectives. Produce the final conditional verdict and composite score.
`.trim();

  return generateStructuredOutput(system, user, debateResultSchema, MODELS.REASONING);
}

// ========== PUBLIC ENTRY POINT ==========

export async function runTriAgentDebate(
  niche: string,
  research: ResearchData,
  userContext: { budget: string; time: string; assets: string[]; stage: string; founderFit?: string[] }
): Promise<DebateResult> {
  console.log('[Debate] Running Builder, Cynic, Operator in parallel...');

  // Run all three agents in parallel
  const [builder, cynic, operator] = await Promise.all([
    runBuilder(niche, research),
    runCynic(niche, research),
    runOperator(niche, research, userContext),
  ]);

  console.log(`[Debate] Builder=${builder.score} (${builder.signal}), Cynic=${cynic.score} (${cynic.signal}), Operator=${operator.score} (${operator.signal})`);

  // Resolve the debate
  const resolved = await resolveDebate(niche, builder, cynic, operator);

  return resolved;
}
