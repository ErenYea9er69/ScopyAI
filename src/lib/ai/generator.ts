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
  geo: string;
  stage: string;
  budget: string;
  time: string;
  assets: string[];
  urls: string;
  sources: string[];
  fit: string[];
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
      time: intake.time,
      stage: intake.stage,
    });
    report.persona = persona.archetype;

    onProgress?.({ step: 'persona', status: 'complete' });

    // ===== STEP 3: Generate Layers 1–7 (batched) =====
    // We run layers in two batches to stay within rate limits
    console.log('[Generator] Step 3: Generating Layers 1–7...');

    const userContext = {
      budget: intake.budget,
      time: intake.time,
      assets: intake.assets,
      stage: intake.stage,
    };

    // --- Batch 1: Layers 1, 2, 3 (parallel) ---
    const [l1, l2, l3] = await Promise.allSettled([
      runLayer('layer1', () => {
        const p = layer1Prompt(intake.niche, intake.geo, research);
        return generateStructuredOutput(p.system, p.user, layer1Schema, MODELS.REASONING);
      }, onProgress),
      runLayer('layer2', () => {
        const p = layer2Prompt(intake.niche, intake.geo, research);
        return generateStructuredOutput(p.system, p.user, layer2Schema, MODELS.REASONING);
      }, onProgress),
      runLayer('layer3', () => {
        const p = layer3Prompt(intake.niche, intake.geo, research, userContext);
        return generateStructuredOutput(p.system, p.user, layer3Schema, MODELS.REASONING);
      }, onProgress),
    ]);

    if (l1.status === 'fulfilled') report.layers.layer1 = l1.value;
    if (l2.status === 'fulfilled') report.layers.layer2 = l2.value;
    if (l3.status === 'fulfilled') report.layers.layer3 = l3.value;

    // --- Batch 2: Layers 4, 5, 6, 7 (parallel) ---
    const [l4, l5, l6, l7] = await Promise.allSettled([
      runLayer('layer4', () => {
        const p = layer4Prompt(intake.niche, research);
        return generateStructuredOutput(p.system, p.user, layer4Schema, MODELS.REASONING);
      }, onProgress),
      runLayer('layer5', () => {
        const p = layer5Prompt(intake.niche, research, userContext);
        return generateStructuredOutput(p.system, p.user, layer5Schema, MODELS.REASONING);
      }, onProgress),
      runLayer('layer6', () => {
        const p = layer6Prompt(intake.niche, intake.geo, research, userContext);
        return generateStructuredOutput(p.system, p.user, layer6Schema, MODELS.REASONING);
      }, onProgress),
      runLayer('layer7', () => {
        const p = layer7Prompt(intake.niche, research);
        return generateStructuredOutput(p.system, p.user, layer7Schema, MODELS.REASONING);
      }, onProgress),
    ]);

    if (l4.status === 'fulfilled') report.layers.layer4 = l4.value;
    if (l5.status === 'fulfilled') report.layers.layer5 = l5.value;
    if (l6.status === 'fulfilled') report.layers.layer6 = l6.value;
    if (l7.status === 'fulfilled') report.layers.layer7 = l7.value;

    // ===== STEP 4: Layer 8 (persona-specific) =====
    await runLayer('layer8', async () => {
      const p = layer8Prompt(intake.niche, persona.archetype as Archetype, research);
      const result = await generateStructuredOutput(p.system, p.user, layer8Schema, MODELS.REASONING);
      report.layers.layer8 = result;
    }, onProgress);

    // ===== STEP 5: Tri-Agent Debate =====
    onProgress?.({ step: 'debate', status: 'started' });
    console.log('[Generator] Step 5: Running Tri-Agent Debate...');

    try {
      report.debate = await runTriAgentDebate(intake.niche, research, userContext);
      onProgress?.({ step: 'debate', status: 'complete' });
    } catch (err) {
      console.error('[Generator] Debate failed:', err);
      onProgress?.({ step: 'debate', status: 'failed' });
    }

    // ===== STEP 6: Auto-Pivot (conditional) =====
    const saturation = report.layers.layer3?.saturationScore?.percentage ?? 0;
    const cynicScore = report.debate?.cynic?.score ?? 0;

    if (shouldTriggerPivot(saturation, cynicScore)) {
      onProgress?.({ step: 'pivot', status: 'started' });
      console.log('[Generator] Step 6: Auto-Pivot triggered!');

      try {
        report.autoPivot = await runAutoPivot(
          intake.niche,
          saturation,
          cynicScore,
          research,
          userContext
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
