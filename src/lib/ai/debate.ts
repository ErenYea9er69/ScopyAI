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
import { agentVerdictSchema, debateResultSchema, type DebateResult, type AgentVerdict } from '../../types/report';
import type { ResearchData } from '../research/orchestrator';

function researchSummary(research: ResearchData): string {
  return [
    '--- MARKET DATA ---',
    research.marketSize.slice(0, 5).join('\n'),
    '--- COMPETITOR DATA ---',
    research.competitors.slice(0, 5).join('\n'),
    '--- PAIN POINT DATA ---',
    research.painPoints.slice(0, 5).join('\n'),
    '--- TREND DATA ---',
    research.trends.slice(0, 3).join('\n'),
    '--- REGULATORY DATA ---',
    research.regulations.slice(0, 2).join('\n'),
  ].join('\n\n');
}

// ========== BUILDER AGENT ==========

async function runBuilder(niche: string, research: ResearchData, layerSummary: string) {
  const system = `
You are The Builder — the opportunity maximiser agent.
Your role is to find EVERY reason this idea could succeed.

AUDIT TASKS:
1. Identify high-velocity demand signals from Layer 1 (JTBD) and Layer 2 (Momentum).
2. Validate the GTM hooks from Layer 6 — do they resonate with the identified pain points?
3. Look for "Counter-Positioning" advantages from Layer 7.

Score opportunity 0–100. Signal: "GO" or "CAUTION".
DATA INTEGRITY: Do NOT invent statistics. Cite [SOURCE: url] where possible.

CRITICAL OUTPUT RULES:
- Your "reasoning" field MUST be at least 100 characters of substantive analysis. Empty strings are REJECTED.
- Your "keyPoints" array MUST have at least 3 items. Each item must be a specific, concrete claim.
- Do NOT use the default score of 50. Commit to a real assessment.

OUTPUT FORMAT: You MUST return ONLY this exact JSON structure:
{
  "score": <number 0-100>,
  "signal": "GO" or "CAUTION",
  "reasoning": "<detailed 2-3 sentence explanation of your score>",
  "keyPoints": ["<specific point 1>", "<specific point 2>", "<specific point 3>"]
}
`.trim();

  const user = `
NICHE: ${niche}
${layerSummary}
${researchSummary(research)}
Find the strongest possible case for success.
`.trim();

  return generateStructuredOutput<AgentVerdict>(system, user, agentVerdictSchema, MODELS.REASONING);
}

// ========== CYNIC AGENT ==========

async function runCynic(niche: string, research: ResearchData, layerSummary: string) {
  const system = `
You are The Cynic — the adversarial risk destroyer.
Your role is to find EVERY reason this idea will fail.

AUDIT & ATTACK TASKS:
1. Audit the Payback Period (Layer 5) — if it's > 18 months, flag it as a cash-flow death trap.
2. Audit the AI Margin (Layer 5) — is this a "thin" AI wrapper with no defensibility?
3. Attack the Moats (Layer 7) — use "Sherlocking" logic: could OpenAI, Apple, or Google eliminate this moat in a single update?
4. FAT-TAIL RISK: Imagine one specific "Black Swan" event (regulatory shift, platform lockout) that wipes this market in 90 days.

Score risk 0–100 (100 = maximum danger). Signal: "KILL", "PIVOT", or "GO".
DATA INTEGRITY: Absence of data is a RED FLAG. Be ruthless. Missing data = higher risk score.

CRITICAL OUTPUT RULES:
- Your "reasoning" field MUST be at least 100 characters of substantive analysis. Empty strings are REJECTED.
- Your "keyPoints" array MUST have at least 3 items. Each item must name a specific, concrete risk.
- Do NOT use the default score of 50. If data is missing, score HIGHER (more dangerous), not neutral.
- You MUST disagree with The Builder. If you cannot find risks, you are not trying hard enough.

OUTPUT FORMAT: You MUST return ONLY this exact JSON structure:
{
  "score": <number 0-100>,
  "signal": "KILL" or "PIVOT" or "GO",
  "reasoning": "<detailed 2-3 sentence explanation of the biggest risks>",
  "keyPoints": ["<specific risk 1>", "<specific risk 2>", "<specific risk 3>"]
}
`.trim();

  const user = `
NICHE: ${niche}
${layerSummary}
${researchSummary(research)}
Find every reason this project will die.
`.trim();

  return generateStructuredOutput<AgentVerdict>(system, user, agentVerdictSchema, MODELS.REASONING);
}

// ========== OPERATOR AGENT ==========

async function runOperator(
  niche: string,
  research: ResearchData,
  userContext: { budget: string; time: string; assets: string[]; stage: string; founderFit?: string[]; acquisitionChannel?: string; revenueModel?: string },
  layerSummary: string
) {
  const system = `
You are The Operator — the execution reality-check agent.
Cross-reference the user's constraints against the GTM and Economics layers.

EQUITY & BURN AUDIT:
1. Compare the GTM Phase 1/2 costs (Layer 6) against the total budget: ${userContext.budget}.
2. Compare the Technical Build vs Buy analysis (Layer 8) against the user's timeline: ${userContext.time}.
3. Is the "First 10" Playbook (Layer 6) actually achievable for a user at the ${userContext.stage} stage with these assets?

Score difficulty 0–100 (100 = impossible). Signal: "EASY", "HARD", or "IMPOSSIBLE".

CRITICAL OUTPUT RULES:
- Your "reasoning" field MUST be at least 100 characters of substantive analysis. Empty strings are REJECTED.
- Your "keyPoints" array MUST have at least 3 items. Each item must name a specific execution constraint.
- Do NOT use the default score of 50. Evaluate the ACTUAL constraints honestly.
- If budget is under $10k and the niche involves AI/ML API costs, score MUST be >= 70.

OUTPUT FORMAT: You MUST return ONLY this exact JSON structure:
{
  "score": <number 0-100>,
  "signal": "EASY" or "HARD" or "IMPOSSIBLE",
  "reasoning": "<detailed 2-3 sentence explanation of execution feasibility>",
  "keyPoints": ["<specific constraint 1>", "<specific constraint 2>", "<specific constraint 3>"]
}
`.trim();

  const user = `
NICHE: ${niche}
USER CONTEXT: Budget=${userContext.budget}, Time=${userContext.time}, Stage=${userContext.stage}
ASSETS: ${userContext.assets.join(', ') || 'None'}
${layerSummary}
${researchSummary(research)}
Evaluate if THIS specific user can execute this exact plan.
`.trim();

  return generateStructuredOutput<AgentVerdict>(system, user, agentVerdictSchema, MODELS.REASONING);
}

// ========== DEBATE RESOLVER ==========

async function resolveDebate(
  niche: string,
  builder: AgentVerdict,
  cynic: AgentVerdict,
  operator: AgentVerdict,
  userContext: { researchObjectives?: string[] },
  layerSummary: string = ''
) {
  const system = `
You are the Debate Resolver. Produce a "VC-Grade" final verdict and execution path.

SCORING RULES:
1. MULTI-GATE CAP: If ANY agent signals "KILL" or "IMPOSSIBLE" (score > 80), the compositeScore MUST be capped at 35, regardless of other scores.
2. CONTRADICTORY CERTAINTY: If Builder and Cynic are within 15 points of each other and both >65, set contradictoryCertainty: true and cap score at 50.

INVESTOR DUEL (CLASH POINTS):
Identify the #1 fundamental disagreement between the Builder and the Cynic.

EXECUTION MILESTONES:
Synthesize a sequence of if-then path:
- GO IF: [Condition to be met] -> [Action to take]
- PIVOT IF: [Trigger event] -> [Alternative path]
- KILL IF: [Warning sign] -> [Exit strategy]

PRIMARY RESEARCH REQUIREMENTS (CRITICAL):
The user MUST not blindly execute this report without primary validation.
Generate 2-3 specific primary research actions the user MUST take before spending capital (e.g., "Run a Van Westendorp pricing survey with 50 executives", "Interview 5 compliance officers").

ASSUMPTIONS LOG:
Identify the biggest unverified leaps in logic the report has made.
List these assumptions, the impact if they are wrong, and the specific validation experiment needed to prove/disprove them.

OUTPUT: Valid JSON matching report.ts/debateResultSchema.
`.trim();

  const user = `
NICHE: ${niche}
${layerSummary}

BUILDER: ${builder.score}/100 - ${builder.signal}. Reasoning: ${builder.reasoning}
CYNIC: ${cynic.score}/100 - ${cynic.signal}. Reasoning: ${cynic.reasoning}
OPERATOR: ${operator.score}/100 - ${operator.signal}. Reasoning: ${operator.reasoning}

Weigh the perspectives and resolve the duel.
Evaluate the debate in the context of the user's specific Research Objectives:
${userContext.researchObjectives?.length ? userContext.researchObjectives.join(', ') : 'None specified'}
`.trim();

  return generateStructuredOutput(system, user, debateResultSchema, MODELS.REASONING);
}

// ========== PUBLIC ENTRY POINT ==========

export async function runTriAgentDebate(
  niche: string,
  research: ResearchData,
  userContext: { budget: string; time: string; assets: string[]; stage: string; founderFit?: string[]; acquisitionChannel?: string; revenueModel?: string; researchObjectives?: string[] },
  layerSummary: string = ''
): Promise<DebateResult> {
  console.log('[Debate] Running Parallel Agent Duel...');

  let [builder, cynic, operator] = await Promise.all([
    runBuilder(niche, research, layerSummary),
    runCynic(niche, research, layerSummary),
    runOperator(niche, research, userContext, layerSummary),
  ]);

  // === GROUPTHINK DETECTION ===
  // If all 3 agents agree within 10 points and all signal GO, the debate is useless.
  // Force a re-run of the Cynic with an amplified adversarial prompt.
  const scores = [builder.score, cynic.score, operator.score];
  const spread = Math.max(...scores) - Math.min(...scores);
  const allGo = builder.signal === 'GO' && (cynic.signal === 'GO' || cynic.signal === '') && (operator.signal === 'EASY' || operator.signal === 'GO' || operator.signal === '');
  
  if (spread <= 10 && allGo) {
    console.warn(`[Debate] GROUPTHINK DETECTED: scores=[${scores.join(',')}], spread=${spread}. Re-running Cynic with amplified adversarial prompt.`);
    try {
      cynic = await runCynic(niche, research, layerSummary + '\n\nCRITICAL OVERRIDE: The Builder scored this idea very high. You MUST find at least 3 existential risks that could kill this business in 12 months. Missing competitor data, unvalidated TAM, and API cost dependency are all valid kill signals. Score MUST be at least 60.');
    } catch (err) {
      console.error('[Debate] Cynic re-run failed, using original:', err);
    }
  }

  const resolved = await resolveDebate(niche, builder, cynic, operator, userContext, layerSummary);

  // Reality-Check Force Override
  if (operator.score >= 85 || cynic.score >= 90) {
    resolved.compositeScore = Math.min(resolved.compositeScore, 30);
  }

  return resolved;
}
