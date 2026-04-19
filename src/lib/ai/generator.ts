/**
 * Report Generator — the master orchestrator.
 *
 * generateReport(intakeData) is the main entry point that coordinates:
 *   Step 1: Run all research queries in parallel
 *   Step 2: Classify persona via LongCat Lite
 *   Step 3: Generate Layers 1–7 (batched parallel)
 *   Step 4: Generate Layer 8 (persona-specific)
 *   Step 5: Run Tri-Agent Debate
 *   Step 6: Run Auto-Pivot (if triggered)
 *   Step 7: Compile final report JSON
 *
 * Handles partial failures gracefully — a failed layer is skipped and noted in transparency.
 */

import { generateStructuredOutput, MODELS } from './client';
import { routePersona, type Archetype } from './router';
import { runTriAgentDebate } from './debate';
import { runAutoPivot, shouldTriggerPivot } from './pivot';
import {
  layer1Prompt,
  layer2Prompt,
  layer3Prompt,
  layer4Prompt,
  layer5Prompt,
  layer6Prompt,
  layer7Prompt,
  layer8Prompt,
} from './prompts/layers';
import { gatherIntelligence, type ResearchData } from '../research/orchestrator';
import {
  layer1Schema, layer2Schema, layer3Schema, layer4Schema,
  layer5Schema, layer6Schema, layer7Schema, layer8Schema,
  type FullReport, type LayerReliabilityScore,
} from '../../types/report';

export type IntakeData = {
  niche: string;
  geography: string;
  stage: string;
  budget: string;
  timeCommitment: string;
  assets: string[];
  competitorUrls: string[];
  complaintPlatforms: string[];
  founderFit: string[];
  goalTimeline: string;
  uniqueInsight: string;
  acquisitionChannel: string;
  buyerType: string;
  revenueModel: string;
  whyNow: string;
};

type ProgressCallback = (update: {
  step: string;
  layer?: string;
  status: 'started' | 'complete' | 'failed';
}) => void;

/**
 * Main entry point — generates a full 8-layer report.
 */
export async function generateReport(
  reportId: string,
  intake: IntakeData,
  onProgress?: ProgressCallback
): Promise<FullReport> {
  const report: FullReport = {
    id: reportId,
    niche: intake.niche,
    persona: 'general',
    status: 'generating',
    layers: {},
    sources: [],
    generatedAt: new Date().toISOString(),
  };

  try {
    // ===== STEP 1: Parallel Research =====
    onProgress?.({ step: 'research', status: 'started' });
    console.log('[Generator] Step 1: Gathering intelligence...');

    const research = await gatherIntelligence(intake);
    report.sources = research.sources;

    onProgress?.({ step: 'research', status: 'complete' });

    // ===== STEP 1b: Pre-Report Complexity-Budget Mismatch Detection =====
    const complexityWarning = detectComplexityBudgetMismatch(intake);
    if (complexityWarning) {
      console.warn(`[Generator] ${complexityWarning}`);
    }

    // ===== STEP 2: Persona Classification =====
    onProgress?.({ step: 'persona', status: 'started' });
    console.log('[Generator] Step 2: Classifying persona...');

    const persona = await routePersona({
      niche: intake.niche,
      assets: intake.assets,
      budget: intake.budget,
      time: intake.timeCommitment,
      stage: intake.stage,
      revenueModel: intake.revenueModel,
      buyerType: intake.buyerType,
    });
    report.persona = persona.archetype;

    onProgress?.({ step: 'persona', status: 'complete' });

    // ===== STEP 3: Generate Layers 1–7 (batched) =====
    // We run layers in two batches to stay within rate limits
    console.log('[Generator] Step 3: Generating Layers 1–7...');

    const userContext = {
      budget: intake.budget,
      time: intake.timeCommitment,
      assets: intake.assets,
      stage: intake.stage,
      founderFit: intake.founderFit,
      timeline: intake.goalTimeline,
      uniqueInsight: intake.uniqueInsight,
      acquisitionChannel: intake.acquisitionChannel,
      buyerType: intake.buyerType,
      revenueModel: intake.revenueModel,
      whyNow: intake.whyNow,
    };

    // --- Batch 1: Layers 1, 2, 3 (parallel) ---
    const [l1, l2, l3] = await Promise.allSettled([
      runLayer('layer1', () => {
        const p = layer1Prompt(intake.niche, intake.geography, research, { buyerType: userContext.buyerType, revenueModel: userContext.revenueModel }, research.researchQuality.summary);
        return generateStructuredOutput(p.system, p.user, layer1Schema, MODELS.REASONING);
      }, onProgress),
      runLayer('layer2', () => {
        const p = layer2Prompt(intake.niche, intake.geography, research, { stage: userContext.stage, buyerType: userContext.buyerType, whyNow: userContext.whyNow }, research.researchQuality.summary);
        return generateStructuredOutput(p.system, p.user, layer2Schema, MODELS.REASONING);
      }, onProgress),
      runLayer('layer3', () => {
        const p = layer3Prompt(intake.niche, intake.geography, research, { ...userContext, whyNow: userContext.whyNow });
        return generateStructuredOutput(p.system, p.user, layer3Schema, MODELS.REASONING);
      }, onProgress),
    ]);

    if (l1.status === 'fulfilled') report.layers.layer1 = l1.value;
    if (l2.status === 'fulfilled') report.layers.layer2 = l2.value;
    if (l3.status === 'fulfilled') report.layers.layer3 = l3.value;

    // --- Layer Cross-Pollination: Build context from Batch 1 for Batch 2 ---
    const batch1Context = buildBatch1Summary(report.layers);
    console.log(`[Generator] Batch 1 cross-pollination context: ${batch1Context.length} chars`);

    // --- Batch 2: Layers 4, 5, 6, 7 (parallel, with Batch 1 context) ---
    const [l4, l5, l6, l7] = await Promise.allSettled([
      runLayer('layer4', () => {
        const p = layer4Prompt(intake.niche, research, intake.competitorUrls, batch1Context);
        return generateStructuredOutput(p.system, p.user, layer4Schema, MODELS.REASONING);
      }, onProgress),
      runLayer('layer5', () => {
        const p = layer5Prompt(intake.niche, research, { ...userContext, goalTimeline: userContext.timeline }, batch1Context);
        return generateStructuredOutput(p.system, p.user, layer5Schema, MODELS.REASONING);
      }, onProgress),
      runLayer('layer6', () => {
        const p = layer6Prompt(intake.niche, intake.geography, research, { ...userContext, goalTimeline: userContext.timeline }, batch1Context);
        return generateStructuredOutput(p.system, p.user, layer6Schema, MODELS.REASONING);
      }, onProgress),
      runLayer('layer7', () => {
        const p = layer7Prompt(intake.niche, research, batch1Context, { stage: userContext.stage, budget: userContext.budget, uniqueInsight: userContext.uniqueInsight });
        return generateStructuredOutput(p.system, p.user, layer7Schema, MODELS.REASONING);
      }, onProgress),
    ]);

    if (l4.status === 'fulfilled') report.layers.layer4 = l4.value;
    if (l5.status === 'fulfilled') report.layers.layer5 = l5.value;
    if (l6.status === 'fulfilled') report.layers.layer6 = l6.value;
    if (l7.status === 'fulfilled') report.layers.layer7 = l7.value;

    // --- Build Batch 2 context for Layer 8 ---
    const batch2Context = buildBatch2Summary(report.layers);

    // ===== STEP 4b: Post-Generation Validation =====
    // Server-side enforcement of constraints the LLM keeps violating
    validateLayerConsistency(report);

    // ===== STEP 4c: Compute Layer Reliability =====
    computeLayerReliability(report);

    // ===== STEP 4d: Extract Fatal Flags =====
    extractFatalFlags(report);

    // ===== STEP 4e: Build full context (inject complexity warning if present) =====
    let fullContext = batch1Context + '\n' + batch2Context;
    if (complexityWarning) {
      fullContext = `\n⚠️ COMPLEXITY-BUDGET MISMATCH: ${complexityWarning}\n` + fullContext;
    }
    await runLayer('layer8', async () => {
      const p = layer8Prompt(intake.niche, persona.archetype as Archetype, research, userContext, intake.geography, fullContext);
      const result = await generateStructuredOutput(p.system, p.user, layer8Schema, MODELS.REASONING);
      report.layers.layer8 = result;
    }, onProgress);

    // ===== STEP 6: Tri-Agent Debate =====
    onProgress?.({ step: 'debate', status: 'started' });
    console.log('[Generator] Step 6: Running Tri-Agent Debate...');

    try {
      const layerSummary = buildLayerSummary(report.layers);
      report.debate = await runTriAgentDebate(intake.niche, research, userContext, layerSummary);
      onProgress?.({ step: 'debate', status: 'complete' });

      // ===== STEP 6b: Reconcile Report Based on Debate =====
      reconcileReport(report);

      // ===== STEP 6c: Generate Verdict =====
      generateVerdict(report);

      // ===== STEP 6d: Apply Confidence Gates =====
      applyConfidenceGates(report);

    } catch (err) {
      console.error('[Generator] Debate failed:', err);
      onProgress?.({ step: 'debate', status: 'failed' });
    }

    // ===== STEP 6: Auto-Pivot (conditional) =====
    const saturation = report.layers.layer3?.saturationScore?.percentage ?? 0;
    const cynicScore = report.debate?.cynic?.score ?? 0;
    const cynicSignal = report.debate?.cynic?.signal ?? '';
    const layer3Failed = !report.layers.layer3;

    // Pivot triggers if: high saturation OR high cynic score OR cynic says KILL OR layer3 crashed with high cynic
    if (shouldTriggerPivot(saturation, cynicScore) || cynicSignal.toUpperCase().includes('KILL') || (layer3Failed && cynicScore > 60)) {
      onProgress?.({ step: 'pivot', status: 'started' });
      console.log('[Generator] Step 6: Auto-Pivot triggered!');

      try {
        report.autoPivot = await runAutoPivot(
          intake.niche,
          saturation,
          cynicScore,
          research,
          userContext,
          intake.geography
        );
        onProgress?.({ step: 'pivot', status: 'complete' });
      } catch (err) {
        console.error('[Generator] Pivot failed:', err);
        onProgress?.({ step: 'pivot', status: 'failed' });
      }
    }

    // ===== STEP 7: Finalise =====
    report.status = 'complete';
    console.log(`[Generator] Report ${reportId} complete! ${report.sources.length} sources.`);

  } catch (err) {
    console.error('[Generator] Fatal error:', err);
    report.status = 'failed';
  }

  return report;
}

// -- Helper to run a single layer with progress tracking and error containment --

async function runLayer<T>(
  layerName: string,
  fn: () => Promise<T>,
  onProgress?: ProgressCallback
): Promise<T> {
  onProgress?.({ step: 'layer', layer: layerName, status: 'started' });
  console.log(`[Generator] Generating ${layerName}...`);
  try {
    const result = await fn();
    onProgress?.({ step: 'layer', layer: layerName, status: 'complete' });
    return result;
  } catch (err) {
    console.error(`[Generator] ${layerName} failed:`, err);
    onProgress?.({ step: 'layer', layer: layerName, status: 'failed' });
    throw err; // Re-throw so Promise.allSettled captures it
  }
}

/**
 * Builds a condensed summary of Batch 1 layers (1, 2, 3) for cross-pollination
 * into Batch 2 layers (5, 6, 7). This ensures downstream layers don't contradict
 * upstream findings.
 */
function buildBatch1Summary(layers: FullReport['layers']): string {
  const parts: string[] = ['=== UPSTREAM INTELLIGENCE (from Layers 1-3) ==='];

  if (layers.layer1) {
    const l1 = layers.layer1;
    parts.push(`[AUDIENCE] Top pain points: ${l1.painPoints?.slice(0, 3).map(p => p.pain).join('; ') || 'Unknown'}`);
    parts.push(`[AUDIENCE] Jobs-to-be-Done: ${l1.jobsToBeDone?.functional || 'Unknown'}`);
    parts.push(`[AUDIENCE] Market Awareness: ${l1.marketAwareness || 'Unknown'}`);
    parts.push(`[AUDIENCE] Payment threshold: ${l1.paymentThreshold?.low || '?'} – ${l1.paymentThreshold?.high || '?'}`);
    parts.push(`[AUDIENCE] Shadow avatar: ${l1.shadowAvatar?.description || 'Not identified'}`);
  } else {
    parts.push(`[AUDIENCE] ⚠️ Layer 1 FAILED — no audience data available. Treat all audience-dependent claims as confidence: "low".`);
  }

  if (layers.layer2) {
    const l2 = layers.layer2;
    parts.push(`[MARKET] TAM: ${l2.tam?.range || 'Unknown'} (confidence: ${l2.tam?.confidence || 'low'})`);
    parts.push(`[MARKET] Momentum: ${l2.marketMomentum?.direction || 'Unknown'} (Score: ${l2.marketMomentum?.velocityScore || 0}/100)`);
    parts.push(`[MARKET] Captured Ease: ${l2.capturedEase?.score || 0}/10 — ${l2.capturedEase?.reasoning || ''}`);
    parts.push(`[MARKET] Timing verdict: ${l2.marketTimingVerdict || 'Unknown'}`);
  } else {
    parts.push(`[MARKET] ⚠️ Layer 2 FAILED — no market data available. Do NOT invent TAM/SAM numbers. Treat all market-dependent claims as confidence: "low".`);
  }

  if (layers.layer3) {
    const l3 = layers.layer3;
    const satPct = l3.saturationScore?.percentage ?? 0;
    const satDisplay = satPct === -1 ? 'UNKNOWN (insufficient data)' : `${satPct}%`;
    parts.push(`[RISK] Saturation: ${satDisplay} — ${l3.saturationScore?.reasoning || ''}`);
    parts.push(`[RISK] AI Native Obsolescence: ${l3.nativeObsolescence?.probability || 0}% risk — ${l3.nativeObsolescence?.threateningFeature || 'None'}`);
    parts.push(`[RISK] Red-Line Blockers: ${l3.redLineBlockers?.map(b => b.blocker).join('; ') || 'None'}`);
    parts.push(`[RISK] Execution difficulty: ${l3.executionDifficulty?.score || 0}/100`);
    parts.push(`[RISK] Gorilla competitors: ${l3.gorillaCompetitors?.map(g => g.name).join(', ') || 'None identified'}`);
  } else {
    parts.push(`[RISK] ⚠️ Layer 3 FAILED — no risk data available. Assume HIGH risk as a precaution.`);
  }

  return parts.join('\n');
}

/**
 * Builds a condensed summary of Batch 2 layers (4, 5, 6, 7) for Layer 8.
 * This gives the persona-specific layer visibility into competitive gaps,
 * unit economics, GTM channels, and moat strategies.
 */
function buildBatch2Summary(layers: FullReport['layers']): string {
  const parts: string[] = ['=== DOWNSTREAM INTELLIGENCE (from Layers 4-7) ==='];

  if (layers.layer4) {
    parts.push(`[COMPETITORS] Vectors of Attack: ${layers.layer4.differentiationVectors?.map(v => v.vector).join('; ') || 'None'}`);
    parts.push(`[COMPETITORS] Top gaps: ${layers.layer4.marketGaps?.slice(0, 2).map(g => g.claim).join('; ') || 'None'}`);
    parts.push(`[COMPETITORS] Price sweet spot: ${layers.layer4.pricingSpectrum?.yourSweetSpot || 'Unknown'}`);
    parts.push(`[COMPETITORS] Count: ${layers.layer4.competitors?.length || 0} identified`);
  }

  if (layers.layer5) {
    parts.push(`[ECONOMICS] Payback: ${layers.layer5.paybackPeriod?.months || '?'} months — ${layers.layer5.paybackPeriod?.verdict || ''}`);
    parts.push(`[ECONOMICS] Margin: ${layers.layer5.grossMarginHealth?.marginPercentage || 0}% — AI COGS: ${layers.layer5.grossMarginHealth?.aiCogsEstimate || '?'}`);
    parts.push(`[ECONOMICS] Optimal price: ${layers.layer5.optimalPricePoint?.price || '?'}`);
  }

  if (layers.layer6) {
    parts.push(`[GTM] Top channels: ${layers.layer6.channelMap?.slice(0, 3).map(c => c.channel).join(', ') || '?'}`);
    parts.push(`[GTM] Unscalable Tactic: ${layers.layer6.unscalablePlaybook?.slice(0, 1).map(t => t.tactic).join('') || '?'}`);
    parts.push(`[GTM] Growth Loop: ${layers.layer6.growthLoops?.slice(0, 1).map(l => l.loopType).join('') || '?'}`);
  }

  if (layers.layer7) {
    parts.push(`[MOAT] Top strategies: ${layers.layer7.moats?.slice(0, 3).map(m => `${m.type}: ${m.strategy.slice(0, 60)}`).join('; ') || '?'}`);
  }

  return parts.join('\n');
}

/**
 * Builds a condensed summary of ALL layer outputs for the debate agents.
 * This ensures the debate critiques the actual REPORT CLAIMS, not just raw research.
 */
function buildLayerSummary(layers: FullReport['layers']): string {
  const parts: string[] = ['=== REPORT CLAIMS TO EVALUATE ==='];

  if (layers.layer1) {
    parts.push(`[L1 AUDIENCE] Jobs: ${layers.layer1.jobsToBeDone?.functional || 'None'}`);
    parts.push(`[L1 AUDIENCE] Awareness: ${layers.layer1.marketAwareness || 'Unknown'}`);
    parts.push(`[L1 AUDIENCE] Price range: ${layers.layer1.paymentThreshold?.low || '?'} – ${layers.layer1.paymentThreshold?.high || '?'}`);
  }

  if (layers.layer2) {
    parts.push(`[L2 MARKET] TAM: ${layers.layer2.tam?.range || '?'} (${layers.layer2.tam?.confidence || 'low'})`);
    parts.push(`[L2 MARKET] Momentum: ${layers.layer2.marketMomentum?.direction || '?'} (Score: ${layers.layer2.marketMomentum?.velocityScore || 0}/100)`);
    parts.push(`[L2 MARKET] Captured Ease: ${layers.layer2.capturedEase?.score || 0}/10`);
    parts.push(`[L2 MARKET] Timing: ${layers.layer2.marketTimingVerdict || '?'}`);
  }

  if (layers.layer3) {
    const satPct = layers.layer3.saturationScore?.percentage ?? 0;
    const satDisplay = satPct === -1 ? 'UNKNOWN' : `${satPct}%`;
    parts.push(`[L3 RISK] Saturation: ${satDisplay}`);
    parts.push(`[L3 RISK] AI Native Risk: ${layers.layer3.nativeObsolescence?.probability || 0}%`);
    parts.push(`[L3 RISK] Red-Lines: ${layers.layer3.redLineBlockers?.length || 0} fatal/critical blockers`);
    parts.push(`[L3 RISK] Execution difficulty: ${layers.layer3.executionDifficulty?.score || 0}/100`);
  }

  if (layers.layer4) {
    parts.push(`[L4 COMPETITORS] Found: ${layers.layer4.competitors?.length || 0} competitors`);
    parts.push(`[L4 COMPETITORS] Vectors: ${layers.layer4.differentiationVectors?.map(v => v.vector).join(', ') || 'None'}`);
    parts.push(`[L4 COMPETITORS] Sweet spot: ${layers.layer4.pricingSpectrum?.yourSweetSpot || '?'}`);
    parts.push(`[L4 COMPETITORS] Gaps: ${layers.layer4.marketGaps?.slice(0, 2).map(g => g.claim).join('; ') || 'None'}`);
  }

  if (layers.layer5) {
    parts.push(`[L5 ECONOMICS] Payback: ${layers.layer5.paybackPeriod?.months || '?'} mo — ${layers.layer5.paybackPeriod?.verdict || ''}`);
    parts.push(`[L5 ECONOMICS] Margin: ${layers.layer5.grossMarginHealth?.marginPercentage || 0}%`);
    parts.push(`[L5 ECONOMICS] LTV:CAC: ${layers.layer5.ltvCacVerdict?.ratio || '?'} — ${layers.layer5.ltvCacVerdict?.verdict || '?'}`);
    parts.push(`[L5 ECONOMICS] Break-even: ${layers.layer5.breakEven?.timeline || '?'}`);
  }

  if (layers.layer6) {
    parts.push(`[L6 GTM] Primary Hook: ${layers.layer6.creativeHooks?.slice(0, 1).map(h => h.angle).join('') || '?'}`);
    parts.push(`[L6 GTM] "First 10" Playbook: ${layers.layer6.unscalablePlaybook?.length || 0} manual tactics`);
    parts.push(`[L6 GTM] Growth Loop mechanism: ${layers.layer6.growthLoops?.slice(0, 1).map(l => l.mechanism).join('') || '?'}`);
    parts.push(`[L6 GTM] Phase 1 Focus: ${layers.layer6.gtmRoadmap?.slice(0, 1).map(r => r.focus).join('') || '?'}`);
  }

  if (layers.layer7) {
    parts.push(`[L7 MOAT] Strategies: ${layers.layer7.moats?.slice(0, 3).map(m => m.type).join(', ') || '?'}`);
  }

  return parts.join('\n');
}

/**
 * Reconciles report layers based on debate results.
 * If the debate flagged significant issues, this function physically
 * annotates the layer outputs so the user sees consistent information.
 *
 * V2: Added contradictory certainty detection — when Builder and Cynic
 * both score >70 with opposing signals, this is a stronger warning than
 * either high-risk or low-builder alone.
 */
function reconcileReport(report: FullReport): void {
  if (!report.debate) return;

  const { cynic, builder, operator, compositeScore, contradictoryCertainty } = report.debate;
  const cynicHigh = cynic.score > 70;
  const builderLow = builder.score < 50;
  const isHighRisk = cynicHigh && builderLow;
  const isNonViable = compositeScore < 30;
  
  // V2: Detect contradictory certainty — both agents highly confident in opposite conclusions
  const scoreDelta = Math.abs(builder.score - cynic.score);
  const isContradictoryCertainty = contradictoryCertainty || 
    (scoreDelta < 15 && builder.score > 70 && cynic.score > 70);
  
  // V2: Detect Operator IMPOSSIBLE override
  const isOperatorImpossible = operator.score > 85;

  console.log(`[Reconciler] Cynic=${cynic.score}, Builder=${builder.score}, Operator=${operator.score}, Composite=${compositeScore}, HighRisk=${isHighRisk}, NonViable=${isNonViable}, ContradictoryCertainty=${isContradictoryCertainty}, OperatorImpossible=${isOperatorImpossible}`);

  if (!isHighRisk && !isNonViable && !isContradictoryCertainty && !isOperatorImpossible) return; // No reconciliation needed

  // Helper: downgrade confidence fields in an object tree
  const downgradeConfidence = (obj: any): void => {
    if (!obj || typeof obj !== 'object') return;
    if (Array.isArray(obj)) {
      obj.forEach(downgradeConfidence);
      return;
    }
    for (const key of Object.keys(obj)) {
      if (key === 'confidence' && (obj[key] === 'high' || obj[key] === 'medium')) {
        obj[key] = 'low';
      } else if (typeof obj[key] === 'object') {
        downgradeConfidence(obj[key]);
      }
    }
  };

  // Helper: append warnings to a layer's notFound array
  const appendWarnings = (layer: any, warnings: string[]): void => {
    if (!layer) return;
    if (!layer.notFound) layer.notFound = [];
    for (const w of warnings) {
      if (!layer.notFound.includes(w)) {
        layer.notFound.push(w);
      }
    }
  };

  const warnings: string[] = [];

  if (isHighRisk) {
    warnings.push(`⚠️ HIGH RISK: Cynic scored ${cynic.score}/100 vs Builder ${builder.score}/100. Key concerns: ${cynic.keyPoints.slice(0, 2).join('; ')}`);
  }

  if (isNonViable) {
    warnings.push(`🚫 NON-VIABLE: Composite debate score ${compositeScore}/100. This niche was flagged as non-viable by the adversarial risk system.`);
  }

  if (isContradictoryCertainty) {
    warnings.push(`⚠️ CONTRADICTORY CERTAINTY: Builder scored ${builder.score}/100 (${builder.signal}) while Cynic scored ${cynic.score}/100 (${cynic.signal}). Both agents are highly confident in OPPOSITE conclusions. The research data supports both optimistic and pessimistic interpretations equally. Treat ALL scores in this report with skepticism.`);
  }

  if (isOperatorImpossible) {
    warnings.push(`🚫 EXECUTION IMPOSSIBLE: Operator scored ${operator.score}/100 — this idea cannot be executed with the user's current budget, skills, and timeline. Key blockers: ${operator.keyPoints.slice(0, 2).join('; ')}`);
  }

  // Apply to all layers
  const layers = report.layers;
  for (const layerKey of Object.keys(layers) as (keyof typeof layers)[]) {
    const layer = layers[layerKey];
    if (!layer) continue;

    // Downgrade confidence on high-risk, contradictory, or impossible reports
    if (isHighRisk || isContradictoryCertainty || isOperatorImpossible) {
      downgradeConfidence(layer);
    }

    // Append debate warnings to notFound
    appendWarnings(layer, warnings);
  }

  // V2: If contradictory certainty was detected server-side but not by the LLM, flag it
  if (isContradictoryCertainty && !report.debate.contradictoryCertainty) {
    report.debate.contradictoryCertainty = true;
  }

  // V2: Enforce Operator override on composite score
  if (isOperatorImpossible && report.debate.compositeScore > 30) {
    console.warn(`[Reconciler] Operator IMPOSSIBLE override: capping compositeScore from ${report.debate.compositeScore} to 30`);
    report.debate.compositeScore = 30;
  }

  // V2: Enforce contradictory certainty cap on composite score
  if (isContradictoryCertainty && report.debate.compositeScore > 50) {
    console.warn(`[Reconciler] Contradictory certainty override: capping compositeScore from ${report.debate.compositeScore} to 50`);
    report.debate.compositeScore = 50;
  }

  console.log(`[Reconciler] Applied ${warnings.length} warnings to ${Object.keys(layers).length} layers. Final compositeScore: ${report.debate.compositeScore}`);
}

/**
 * Post-generation validation — server-side enforcement of constraints
 * the LLM keeps violating despite prompt instructions.
 *
 * v3: Two critical checks:
 *   1. executionDifficulty score vs blocker text consistency
 *   2. Cross-layer budget exhaustion detection
 */
function validateLayerConsistency(report: FullReport): void {
  // === CHECK 1: executionDifficulty score must match blocker severity ===
  if (report.layers.layer3) {
    const l3 = report.layers.layer3;
    const score = l3.executionDifficulty?.score ?? 0;
    const blockers = l3.executionDifficulty?.blockers || [];
    
    const FATAL_KEYWORDS = [
      'fatal', 'impossible', 'exceeds budget', 'exceeds total budget',
      'cannot be built', 'mhra', 'fda', 'hipaa', 'fatal execution blocker',
      'regulatory compliance', 'medical device', 'exceeds', 'unfundable',
    ];
    
    const hasFatalBlocker = blockers.some((b: string) => 
      FATAL_KEYWORDS.some(kw => b.toLowerCase().includes(kw))
    );
    
    if (hasFatalBlocker && score < 50) {
      console.warn(`[Validator] OVERRIDE: executionDifficulty score ${score} is inconsistent with fatal blockers. Overriding to 85.`);
      console.warn(`[Validator] Fatal blockers found: ${blockers.filter((b: string) => FATAL_KEYWORDS.some(kw => b.toLowerCase().includes(kw))).join(' | ')}`);
      
      l3.executionDifficulty.score = 85;
      
      // Add warning to notFound
      if (!l3.notFound) l3.notFound = [];
      l3.notFound.push(
        `⚠️ SCORE OVERRIDE: Original executionDifficulty score (${score}/100) was inconsistent with fatal blockers listed in the same section. Server-side correction applied to ${l3.executionDifficulty.score}/100.`
      );
    }
  }

  // === CHECK 2: Cross-layer budget consistency ===
  if (report.layers.layer5 && report.layers.layer6) {
    const l5 = report.layers.layer5;
    
    // Check if payback period is dangerously long
    const paybackMonths = l5.paybackPeriod?.months || 0;
    
    if (paybackMonths > 18) {
      if (!l5.notFound) l5.notFound = [];
      const warning = `⚠️ ADVISORY: Payback period (${paybackMonths} months) is extremely long. High risk of cash-flow failure before reaching profitability.`;
      if (!l5.notFound.includes(warning)) l5.notFound.push(warning);
    }
  }

  console.log('[Validator] Post-generation validation complete.');
}

/**
 * v5: Compute per-layer reliability scores based on confidence field distribution.
 * Score formula: (high×3 + medium×2 + low×1) / (total×3) × 100
 */
function computeLayerReliability(report: FullReport): void {
  const reliability: Record<string, LayerReliabilityScore> = {};

  for (const [layerName, layer] of Object.entries(report.layers)) {
    if (!layer) continue;

    let high = 0, medium = 0, low = 0;

    const countConfidence = (obj: any): void => {
      if (!obj || typeof obj !== 'object') return;
      if (Array.isArray(obj)) { obj.forEach(countConfidence); return; }
      for (const key of Object.keys(obj)) {
        if (key === 'confidence') {
          const val = String(obj[key]).toLowerCase();
          if (val === 'high') high++;
          else if (val === 'medium') medium++;
          else low++;
        } else if (typeof obj[key] === 'object') {
          countConfidence(obj[key]);
        }
      }
    };

    countConfidence(layer);
    const total = high + medium + low;
    const score = total > 0 ? Math.round(((high * 3 + medium * 2 + low * 1) / (total * 3)) * 100) : 0;
    const verdict: 'RELIABLE' | 'DIRECTIONAL' | 'SPECULATIVE' = score >= 70 ? 'RELIABLE' : score >= 40 ? 'DIRECTIONAL' : 'SPECULATIVE';

    reliability[layerName] = { totalDataPoints: total, highConfidence: high, mediumConfidence: medium, lowConfidence: low, score, verdict };
  }

  report.layerReliability = reliability;

  const avgScore = Object.values(reliability).length > 0
    ? Math.round(Object.values(reliability).reduce((s, r) => s + r.score, 0) / Object.values(reliability).length)
    : 0;
  console.log(`[Reliability] Report-level reliability: ${avgScore}/100. Per-layer: ${Object.entries(reliability).map(([k, v]) => `${k}=${v.score}(${v.verdict})`).join(', ')}`);
}

/**
 * v5: Extract fatal flags from all notFound arrays and promote to report.fatalFlags.
 */
function extractFatalFlags(report: FullReport): void {
  const FATAL_KEYWORDS = ['IMPOSSIBLE', 'NON-VIABLE', 'KILL', 'FATAL', 'BLOCKED', 'EXECUTION IMPOSSIBLE', 'BUDGET-GTM CONTRADICTION', 'SCORE OVERRIDE', 'STRUCTURALLY NON-VIABLE'];
  const fatalFlags: string[] = [];

  for (const [, layer] of Object.entries(report.layers)) {
    if (!layer) continue;
    const notFound = (layer as any).notFound as string[] | undefined;
    if (!notFound) continue;

    for (const entry of notFound) {
      const upper = entry.toUpperCase();
      if (FATAL_KEYWORDS.some(kw => upper.includes(kw))) {
        if (!fatalFlags.includes(entry)) {
          fatalFlags.push(entry);
        }
      }
    }
  }

  report.fatalFlags = fatalFlags;
  if (fatalFlags.length > 0) {
    console.warn(`[FatalFlags] Extracted ${fatalFlags.length} fatal flags from report layers.`);
  }
}

/**
 * v5: Generate top-level verdict based on debate scores and fatal flags.
 */
function generateVerdict(report: FullReport): void {
  if (!report.debate) return;

  const { operator, cynic, builder, compositeScore } = report.debate;
  const cynicSignal = cynic.signal?.toUpperCase() || '';
  const operatorSignal = operator.signal?.toUpperCase() || '';
  const fatalCount = report.fatalFlags?.length || 0;

  let label: 'GO' | 'PROCEED_WITH_CAUTION' | 'DO_NOT_PROCEED';
  let reason: string;
  let recommendedAction: string;

  if (operator.score >= 85 || operatorSignal.includes('IMPOSSIBLE')) {
    label = 'DO_NOT_PROCEED';
    reason = `Execution rated IMPOSSIBLE (${operator.score}/100). The idea cannot be built with the stated budget, skills, and timeline.`;
    recommendedAction = 'Pivot to a simpler version that removes hardware dependencies, regulatory requirements, and API access barriers. Validate demand with zero-tech manual service first.';
  } else if (compositeScore < 30 || cynicSignal.includes('KILL')) {
    label = 'DO_NOT_PROCEED';
    reason = `Composite score ${compositeScore}/100 — the adversarial analysis found fundamental viability problems. ${cynic.keyPoints?.[0] || ''}`;
    recommendedAction = 'Review the Cynic analysis and pivot options. The current formulation has structural flaws that cannot be fixed with iteration.';
  } else if (compositeScore <= 50 || operator.score >= 65 || fatalCount >= 3) {
    label = 'PROCEED_WITH_CAUTION';
    reason = `Composite score ${compositeScore}/100 with ${fatalCount} fatal flag(s). Significant risks identified but the idea may be viable with modifications.`;
    recommendedAction = 'Resolve the top blockers listed below before investing time or money. Complete primary customer research (20+ conversations) first.';
  } else {
    label = 'GO';
    reason = `Composite score ${compositeScore}/100. Market opportunity identified with manageable execution risks.`;
    recommendedAction = 'Begin with the validation roadmap in Layer 6. Target first 5 paying customers within 30 days using the recommended GTM channels.';
  }

  // Top blockers from fatal flags
  const topBlockers = (report.fatalFlags || []).slice(0, 3).map(f => {
    // Truncate long flags for the verdict block
    return f.length > 200 ? f.substring(0, 200) + '...' : f;
  });

  // Add operator key points if not enough blockers
  if (topBlockers.length < 3 && operator.keyPoints) {
    for (const kp of operator.keyPoints) {
      if (topBlockers.length >= 3) break;
      if (!topBlockers.some(b => b.includes(kp.substring(0, 30)))) {
        topBlockers.push(kp);
      }
    }
  }

  report.verdict = { label, reason, topBlockers, recommendedAction };
  console.log(`[Verdict] ${label}: ${reason}`);
}

/**
 * v5: Apply confidence-gated content suppression.
 * Locks GTM/moat/revenue sections when data quality is too low.
 */
function applyConfidenceGates(report: FullReport): void {
  const suppression = {
    gtmPlanSuppressed: false,
    moatStrategiesSuppressed: false,
    revenueProjectionsSuppressed: false,
    reason: '',
  };

  const reasons: string[] = [];

  // === Gate 1: GTM Plan requires validated buyer data ===
  if (report.layers.layer1) {
    const l1 = report.layers.layer1;
    const l1Reliability = report.layerReliability?.layer1;

    // Count medium+ confidence pain points
    const validatedPainPoints = l1.painPoints?.filter(p => p.confidence !== 'low').length || 0;
    // Check for verbatim buyer quotes
    const hasBuyerQuotes = (l1.buyerLanguage?.length || 0) > 0 &&
      !l1.buyerLanguage?.every(q => q.quote.toLowerCase().includes('no direct quotes'));

    if (validatedPainPoints < 3 && !hasBuyerQuotes) {
      suppression.gtmPlanSuppressed = true;
      reasons.push('GTM BLOCKED: Fewer than 3 validated pain points and no verbatim buyer quotes.');

      // Suppress GTM plan content
      if (report.layers.layer6) {
        if (!report.layers.layer6.notFound) report.layers.layer6.notFound = [];
        report.layers.layer6.notFound.unshift(
          '🚫 GTM PLAN RELIABILITY WARNING: This plan was generated with insufficient validated buyer data. ' +
          `Only ${validatedPainPoints} pain points have medium+ confidence, and ${hasBuyerQuotes ? '' : 'no '}verbatim buyer quotes were found. ` +
          'Complete primary research (20+ customer conversations) before executing this plan.'
        );
      }
    }
  }

  // === Gate 2: Moat strategies require product-market evidence ===
  if (report.layers.layer2) {
    const tamConfidence = report.layers.layer2.tam?.confidence;
    const tamRange = report.layers.layer2.tam?.range?.toLowerCase() || '';
    const isTamMissing = tamConfidence === 'low' && (tamRange.includes('insufficient') || tamRange.includes('no data'));

    if (isTamMissing) {
      suppression.moatStrategiesSuppressed = true;
      reasons.push('MOAT BLOCKED: TAM is unknown — moat strategies without market size validation are speculative.');

      if (report.layers.layer7) {
        if (!report.layers.layer7.notFound) report.layers.layer7.notFound = [];
        report.layers.layer7.notFound.unshift(
          '🚫 MOAT ANALYSIS WARNING: TAM data is insufficient. Moat strategies are speculative without a validated market size. ' +
          'Determine addressable market before investing in competitive moats.'
        );
      }
    }
  }

  // === Gate 3: Revenue projections require Operator sanity ===
  if (report.debate?.operator && report.debate.operator.score >= 85) {
    suppression.revenueProjectionsSuppressed = true;
    reasons.push(`REVENUE BLOCKED: Operator scored ${report.debate.operator.score}/100 IMPOSSIBLE.`);

    if (report.layers.layer5) {
      if (!report.layers.layer5.notFound) report.layers.layer5.notFound = [];
      report.layers.layer5.notFound.unshift(
        `🚫 REVENUE PROJECTIONS ARE THEORETICAL ONLY: Operator analysis scored execution as ${report.debate.operator.score}/100 (IMPOSSIBLE). ` +
        'Revenue figures below assume constraints are resolved. Do not use for budgeting or fundraising.'
      );
    }
  }

  suppression.reason = reasons.join(' | ');
  report.contentSuppressed = suppression;

  if (reasons.length > 0) {
    console.warn(`[ConfidenceGates] ${reasons.length} gate(s) triggered: ${reasons.join('; ')}`);
  }
}

/**
 * v5: Pre-report complexity-budget mismatch detection.
 * Scans niche description for complexity indicators and compares to budget.
 */
function detectComplexityBudgetMismatch(intake: IntakeData): string | null {
  const COMPLEXITY_KEYWORDS = [
    'cgm', 'glucose', 'medical', 'clinical', 'diagnostic', 'fda', 'mhra',
    'hardware', 'sensor', 'wearable', 'api integration', 'blockchain',
    'hipaa', 'gdpr compliance', 'medical device', 'regulated',
  ];

  const nicheLower = intake.niche.toLowerCase();
  const matchedKeywords = COMPLEXITY_KEYWORDS.filter(kw => nicheLower.includes(kw));

  if (matchedKeywords.length === 0) return null;

  // Parse budget — extract numbers
  const budgetStr = intake.budget || '0';
  const budgetMatch = budgetStr.match(/[\d,]+/g);
  const budget = budgetMatch ? Math.max(...budgetMatch.map(b => parseFloat(b.replace(/,/g, '')))) : 0;

  if (budget < 20000 && matchedKeywords.length >= 1) {
    return `Your idea contains complexity indicators (${matchedKeywords.join(', ')}) that typically require $50,000-$200,000+ to bring to market. Your stated budget is ${budgetStr}. The report will flag execution impossibility throughout.`;
  }

  return null;
}
