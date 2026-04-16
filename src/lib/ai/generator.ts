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
import { gatherIntelligence, type ResearchData } from '@/lib/research/orchestrator';
import {
  layer1Schema, layer2Schema, layer3Schema, layer4Schema,
  layer5Schema, layer6Schema, layer7Schema, layer8Schema,
  type FullReport,
} from '@/types/report';

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
    const fullContext = batch1Context + '\n' + batch2Context;

    // ===== STEP 4: Layer 8 (persona-specific) =====
    await runLayer('layer8', async () => {
      const p = layer8Prompt(intake.niche, persona.archetype as Archetype, research, userContext, intake.geography, fullContext);
      const result = await generateStructuredOutput(p.system, p.user, layer8Schema, MODELS.REASONING);
      report.layers.layer8 = result;
    }, onProgress);

    // ===== STEP 5: Tri-Agent Debate =====
    onProgress?.({ step: 'debate', status: 'started' });
    console.log('[Generator] Step 5: Running Tri-Agent Debate...');

    try {
      const layerSummary = buildLayerSummary(report.layers);
      report.debate = await runTriAgentDebate(intake.niche, research, userContext, layerSummary);
      onProgress?.({ step: 'debate', status: 'complete' });

      // ===== STEP 5b: Reconcile Report Based on Debate =====
      reconcileReport(report);

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
    parts.push(`[AUDIENCE] Payment threshold: ${l1.paymentThreshold?.low || '?'} – ${l1.paymentThreshold?.high || '?'}`);
    parts.push(`[AUDIENCE] Shadow avatar: ${l1.shadowAvatar?.description || 'Not identified'}`);
  } else {
    parts.push(`[AUDIENCE] ⚠️ Layer 1 FAILED — no audience data available. Treat all audience-dependent claims as confidence: "low".`);
  }

  if (layers.layer2) {
    const l2 = layers.layer2;
    parts.push(`[MARKET] TAM: ${l2.tam?.range || 'Unknown'} (confidence: ${l2.tam?.confidence || 'low'})`);
    parts.push(`[MARKET] Trend: ${l2.trendTrajectory?.direction || 'Unknown'} — ${l2.trendTrajectory?.searchVolumeTrend || ''}`);
    parts.push(`[MARKET] Timing verdict: ${l2.marketTimingVerdict || 'Unknown'}`);
    parts.push(`[MARKET] Sentiment: ${l2.sentimentVelocity?.overall || 'Unknown'}`);
  } else {
    parts.push(`[MARKET] ⚠️ Layer 2 FAILED — no market data available. Do NOT invent TAM/SAM numbers. Treat all market-dependent claims as confidence: "low".`);
  }

  if (layers.layer3) {
    const l3 = layers.layer3;
    parts.push(`[RISK] Saturation: ${l3.saturationScore?.percentage || 0}% — ${l3.saturationScore?.reasoning || ''}`);
    parts.push(`[RISK] AI disruption: ${l3.aiDisruptionRisk?.score || 0}/10 — ${l3.aiDisruptionRisk?.threateningModel || 'None identified'}`);
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
    parts.push(`[COMPETITORS] Top gaps: ${layers.layer4.marketGaps?.slice(0, 2).map(g => g.claim).join('; ') || 'None'}`);
    parts.push(`[COMPETITORS] Price sweet spot: ${layers.layer4.pricingSpectrum?.yourSweetSpot || 'Unknown'}`);
    parts.push(`[COMPETITORS] Count: ${layers.layer4.competitors?.length || 0} identified`);
  }

  if (layers.layer5) {
    parts.push(`[ECONOMICS] CAC: ${layers.layer5.cacBenchmark?.range || '?'} (${layers.layer5.cacBenchmark?.confidence || 'low'})`);
    parts.push(`[ECONOMICS] Break-even: ${layers.layer5.breakEven?.timeline || '?'}`);
    parts.push(`[ECONOMICS] Optimal price: ${layers.layer5.optimalPricePoint?.price || '?'}`);
  }

  if (layers.layer6) {
    parts.push(`[GTM] Top channels: ${layers.layer6.channelMap?.slice(0, 3).map(c => c.channel).join(', ') || '?'}`);
    parts.push(`[GTM] Revenue model: ${layers.layer6.revenueModelFit?.slice(0, 1).map(r => `${r.model} (${r.fit})`).join('') || '?'}`);
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
    parts.push(`[L1 AUDIENCE] Top pains: ${layers.layer1.painPoints?.slice(0, 3).map(p => `${p.pain} (${p.confidence})`).join('; ') || 'None'}`);
    parts.push(`[L1 AUDIENCE] Price range: ${layers.layer1.paymentThreshold?.low || '?'} – ${layers.layer1.paymentThreshold?.high || '?'}`);
  }

  if (layers.layer2) {
    parts.push(`[L2 MARKET] TAM: ${layers.layer2.tam?.range || '?'} (${layers.layer2.tam?.confidence || 'low'})`);
    parts.push(`[L2 MARKET] Trend: ${layers.layer2.trendTrajectory?.direction || '?'}`);
    parts.push(`[L2 MARKET] Timing: ${layers.layer2.marketTimingVerdict || '?'}`);
  }

  if (layers.layer3) {
    parts.push(`[L3 RISK] Saturation: ${layers.layer3.saturationScore?.percentage || 0}%`);
    parts.push(`[L3 RISK] AI disruption: ${layers.layer3.aiDisruptionRisk?.score || 0}/10`);
    parts.push(`[L3 RISK] Execution difficulty: ${layers.layer3.executionDifficulty?.score || 0}/100`);
  }

  if (layers.layer4) {
    parts.push(`[L4 COMPETITORS] Found: ${layers.layer4.competitors?.length || 0} competitors`);
    parts.push(`[L4 COMPETITORS] Sweet spot: ${layers.layer4.pricingSpectrum?.yourSweetSpot || '?'}`);
    parts.push(`[L4 COMPETITORS] Gaps: ${layers.layer4.marketGaps?.slice(0, 2).map(g => g.claim).join('; ') || 'None'}`);
  }

  if (layers.layer5) {
    parts.push(`[L5 ECONOMICS] CAC: ${layers.layer5.cacBenchmark?.range || '?'} (${layers.layer5.cacBenchmark?.confidence || 'low'})`);
    parts.push(`[L5 ECONOMICS] LTV:CAC: ${layers.layer5.ltvCacVerdict?.ratio || '?'} — ${layers.layer5.ltvCacVerdict?.verdict || '?'}`);
    parts.push(`[L5 ECONOMICS] Break-even: ${layers.layer5.breakEven?.timeline || '?'}`);
  }

  if (layers.layer6) {
    parts.push(`[L6 GTM] Channels: ${layers.layer6.channelMap?.slice(0, 3).map(c => c.channel).join(', ') || '?'}`);
    parts.push(`[L6 GTM] Revenue models: ${layers.layer6.revenueModelFit?.slice(0, 2).map(r => `${r.model} (${r.fit})`).join(', ') || '?'}`);
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
 */
function reconcileReport(report: FullReport): void {
  if (!report.debate) return;

  const { cynic, builder, compositeScore } = report.debate;
  const cynicHigh = cynic.score > 70;
  const builderLow = builder.score < 50;
  const isHighRisk = cynicHigh && builderLow;
  const isNonViable = compositeScore < 30;

  console.log(`[Reconciler] Cynic=${cynic.score}, Builder=${builder.score}, Composite=${compositeScore}, HighRisk=${isHighRisk}, NonViable=${isNonViable}`);

  if (!isHighRisk && !isNonViable) return; // No reconciliation needed

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

  // Apply to all layers
  const layers = report.layers;
  for (const layerKey of Object.keys(layers) as (keyof typeof layers)[]) {
    const layer = layers[layerKey];
    if (!layer) continue;

    // Downgrade confidence on high-risk reports
    if (isHighRisk) {
      downgradeConfidence(layer);
    }

    // Append debate warnings to notFound
    appendWarnings(layer, warnings);
  }

  console.log(`[Reconciler] Applied ${warnings.length} warnings to ${Object.keys(layers).length} layers.`);
}
