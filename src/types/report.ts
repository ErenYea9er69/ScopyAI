import { z } from 'zod';

// ========== SHARED RESILIENT PRIMITIVES ==========

/**
 * Robustly parses and normalizes confidence levels.
 * Handles case-insensitivity and falls back to 'medium' on error.
 */
export const confidenceLevel = z.preprocess(
  (val) => String(val || 'medium').toLowerCase(),
  z.enum(['high', 'medium', 'low'])
).catch('medium');
export type ConfidenceLevel = z.infer<typeof confidenceLevel>;

/**
 * A score schema that:
 * 1. Coerces values to numbers
 * 2. Clamps values to the range [0, 100]
 * 3. Falls back to a safe default on total failure
 */
export const resilientScore = z.preprocess((val) => {
  const num = parseFloat(String(val).replace(/[^\d.-]/g, ''));
  if (isNaN(num)) return 50;
  return Math.min(100, Math.max(0, num));
}, z.number().min(0).max(100)).catch(50);

/**
 * Same as resilientScore but for 0-10 scales.
 * Automatically scales 0-100 inputs down to 0-10.
 */
export const resilientScore10 = z.preprocess((val) => {
  const num = parseFloat(String(val).replace(/[^\d.-]/g, ''));
  if (isNaN(num)) return 5;
  // If LLM returns a percentage (e.g. 75) for a 10-point scale, scale it down.
  const base = num > 10 ? num / 10 : num;
  return Math.min(10, Math.max(0, base));
}, z.number().min(0).max(10)).catch(5);

/**
 * Handles percentages (e.g., "75%", 75, "0.75").
 * Always returns a number between 0 and 100.
 */
export const percentSchema = z.preprocess((val) => {
  if (typeof val === 'string') {
    const clean = val.replace(/[^\d.-]/g, '');
    let num = parseFloat(clean);
    if (val.includes('%') && num > 0 && num <= 1) num = num * 100; // handle "0.75%" typo
    if (num > 0 && num <= 1 && !val.includes('%')) num = num * 100; // handle loose 0.75
    return Math.min(100, Math.max(0, num));
  }
  const num = typeof val === 'number' ? val : 0;
  return num <= 1 && num > 0 ? num * 100 : num;
}, z.number().min(0).max(100)).catch(0);

export const citedClaim = z.object({
  claim: z.string().default('No claim provided'),
  source: z.coerce.string().optional().default(''),
  confidence: confidenceLevel,
}).default({
  claim: 'No claim provided',
  source: '',
  confidence: 'medium'
});
export type CitedClaim = z.infer<typeof citedClaim>;

// ========== LAYER 1: AUDIENCE INTELLIGENCE ==========

export const layer1Schema = z.object({
  painPoints: z.array(z.object({
    pain: z.string().default(''),
    frequency: z.string().default(''),
    emotionalIntensity: z.string().default(''),
    wtpSignal: z.string().default(''),
    source: z.string().optional().default(''),
    confidence: confidenceLevel,
  })).default([]),
  buyerLanguage: z.array(z.object({
    quote: z.string().default(''),
    source: z.string().default(''),
    context: z.string().default(''),
  })).default([]),
  purchaseTriggers: z.array(citedClaim).default([]),
  jobsToBeDone: z.object({
    functional: z.string().default(''),
    social: z.string().default(''),
    emotional: z.string().default(''),
  }).default({ functional: '', social: '', emotional: '' }),
  marketAwareness: z.preprocess(
    (val) => String(val || 'problem_aware').toLowerCase(),
    z.enum(['unaware', 'problem_aware', 'solution_aware', 'product_aware', 'most_aware'])
  ).catch('problem_aware'),
  avatar: z.object({
    expertiseLevel: z.string().default(''),
    mentalModel: z.string().default(''),
    platforms: z.array(z.string()).default([]),
    identity: z.string().default(''),
    selfNarrative: z.string().default(''),
    trustedInfluencers: z.array(z.string()).default([]),
    contentConsumed: z.array(z.string()).default([]),
  }).default({
    expertiseLevel: '',
    mentalModel: '',
    platforms: [],
    identity: '',
    selfNarrative: '',
    trustedInfluencers: [],
    contentConsumed: []
  }),
  nicheHangouts: z.array(z.object({
    name: z.string().default(''),
    type: z.string().default(''),
    activityLevel: z.string().default(''),
  })).default([]),
  dmu: z.array(z.object({
    role: z.string().default(''),
    priority: z.string().default(''),
    keyConcern: z.string().default(''),
  })).optional().default([]),
  hiddenObjections: z.array(citedClaim).default([]),
  desiresAndDreams: z.array(citedClaim).default([]),
  shadowAvatar: z.object({
    description: z.string().default(''),
    whyTheyWontBuy: z.string().default(''),
    howToExclude: z.string().default(''),
  }).default({ description: '', whyTheyWontBuy: '', howToExclude: '' }),
  paymentThreshold: z.object({
    low: z.string().default(''),
    mid: z.string().default(''),
    high: z.string().default(''),
    reasoning: z.string().default(''),
  }).default({ low: '', mid: '', high: '', reasoning: '' }),
  notFound: z.array(z.string()).default([]),
}).default({
  painPoints: [],
  buyerLanguage: [],
  purchaseTriggers: [],
  jobsToBeDone: { functional: '', social: '', emotional: '' },
  marketAwareness: 'problem_aware',
  avatar: {
    expertiseLevel: '',
    mentalModel: '',
    platforms: [],
    identity: '',
    selfNarrative: '',
    trustedInfluencers: [],
    contentConsumed: []
  },
  nicheHangouts: [],
  dmu: [],
  hiddenObjections: [],
  desiresAndDreams: [],
  shadowAvatar: { description: '', whyTheyWontBuy: '', howToExclude: '' },
  paymentThreshold: { low: '', mid: '', high: '', reasoning: '' },
  notFound: []
});
export type Layer1 = z.infer<typeof layer1Schema>;

// ========== LAYER 2: MARKET INTELLIGENCE ==========

export const layer2Schema = z.object({
  tam: z.object({ range: z.string().default(''), confidence: confidenceLevel, sources: z.array(z.coerce.string()).default([]) }).default({ range: '', confidence: 'medium', sources: [] }),
  sam: z.object({ range: z.string().default(''), confidence: confidenceLevel, sources: z.array(z.coerce.string()).default([]) }).default({ range: '', confidence: 'medium', sources: [] }),
  som: z.object({ range: z.string().default(''), confidence: confidenceLevel, sources: z.array(z.coerce.string()).default([]) }).default({ range: '', confidence: 'medium', sources: [] }),
  proxyMarketComparison: z.object({
    parentMarket: z.string().default(''),
    penetrationPotential: z.string().default(''),
    ceilingProxy: z.string().default(''),
  }).default({ parentMarket: '', penetrationPotential: '', ceilingProxy: '' }),
  capturedEase: z.object({
    score: resilientScore10,
    reasoning: z.string().default(''),
  }).default({ score: 5, reasoning: '' }),
  geographicExpansionMap: z.object({
    tier1: z.array(z.string()).default([]),
    tier2: z.array(z.string()).default([]),
    tier3: z.array(z.string()).default([]),
    reasoning: z.string().default(''),
  }).default({ tier1: [], tier2: [], tier3: [], reasoning: '' }),
  marketMomentum: z.object({
    direction: z.preprocess(
      (val) => String(val || 'stable').toLowerCase(),
      z.enum(['growing', 'stable', 'declining'])
    ).catch('stable'),
    velocityScore: resilientScore,
    searchVolumeTrend: z.string().default(''),
    socialSentiment: z.string().default(''),
    fundingActivity: z.string().default(''),
  }).default({ direction: 'stable', velocityScore: 50, searchVolumeTrend: '', socialSentiment: '', fundingActivity: '' }),
  macroInflectionPoints: z.array(z.object({
    trigger: z.string().default(''),
    marketImpact: z.string().default(''),
    timing: z.string().default(''),
  })).default([]),
  marketTimingVerdict: z.string().default(''),
  notFound: z.array(z.string()).default([]),
}).default({
  tam: { range: '', confidence: 'medium', sources: [] },
  sam: { range: '', confidence: 'medium', sources: [] },
  som: { range: '', confidence: 'medium', sources: [] },
  proxyMarketComparison: { parentMarket: '', penetrationPotential: '', ceilingProxy: '' },
  capturedEase: { score: 5, reasoning: '' },
  geographicExpansionMap: { tier1: [], tier2: [], tier3: [], reasoning: '' },
  marketMomentum: { direction: 'stable', velocityScore: 50, searchVolumeTrend: '', socialSentiment: '', fundingActivity: '' },
  macroInflectionPoints: [],
  marketTimingVerdict: '',
  notFound: []
});
export type Layer2 = z.infer<typeof layer2Schema>;

// ========== LAYER 3: SURVIVAL INTELLIGENCE ==========

export const layer3Schema = z.object({
  dyingTrendSignals: z.array(citedClaim).default([]),
  nativeObsolescence: z.object({
    probability: percentSchema,
    threateningFeature: z.string().default(''),
    timeframe: z.string().default(''),
    reasoning: z.string().default(''),
  }).default({ probability: 0, threateningFeature: '', timeframe: '', reasoning: '' }),
  aiDisruptionRisk: z.object({
    score: resilientScore10,
    threateningModel: z.string().default(''),
    valueAtRisk: z.string().default(''),
    confidence: confidenceLevel,
  }).default({ score: 0, threateningModel: '', valueAtRisk: '', confidence: 'medium' }),
  platformDependency: z.object({
    score: resilientScore10,
    primaryPlatform: z.string().default(''),
    risk: z.string().default(''),
  }).default({ score: 0, primaryPlatform: '', risk: '' }),
  platformComplianceRisk: z.object({
    appleGoogleRisk: z.string().default(''),
    apiProviderRisk: z.string().default(''),
    mitigation: z.string().default(''),
  }).default({ appleGoogleRisk: '', apiProviderRisk: '', mitigation: '' }),
  saturationScore: z.object({
    percentage: percentSchema,
    reasoning: z.string().default(''),
  }).default({ percentage: 0, reasoning: '' }),
  redLineBlockers: z.array(z.object({
    fact: z.string().default(''),
    blocker: z.string().default(''),
    severity: z.preprocess(
      (val) => String(val || 'critical').toLowerCase(),
      z.enum(['fatal', 'critical'])
    ).catch('critical'),
  })).default([]),
  legalMatrix: z.array(z.object({
    jurisdiction: z.string().default(''),
    status: z.string().default(''),
    risk: z.string().default(''),
  })).default([]),
  gorillaCompetitors: z.array(z.object({
    name: z.string().default(''),
    threat: z.string().default(''),
    defence: z.string().default(''),
  })).default([]),
  executionDifficulty: z.object({
    score: resilientScore,
    blockers: z.array(z.string()).default([]),
  }).default({ score: 50, blockers: [] }),
  pivotBuffer: z.object({
    score: resilientScore10,
    runwayUnits: z.string().default(''),
    reasoning: z.string().default(''),
  }).default({ score: 5, runwayUnits: '', reasoning: '' }),
  scenarioSimulator: z.array(z.object({
    threat: z.string().default(''),
    probability: z.string().default(''),
    consequence: z.string().default(''),
    cascadingEffect: z.string().default(''),
  })).default([]),
  notFound: z.array(z.string()).default([]),
}).default({
  dyingTrendSignals: [],
  nativeObsolescence: { probability: 0, threateningFeature: '', timeframe: '', reasoning: '' },
  aiDisruptionRisk: { score: 0, threateningModel: '', valueAtRisk: '', confidence: 'medium' },
  platformDependency: { score: 0, primaryPlatform: '', risk: '' },
  platformComplianceRisk: { appleGoogleRisk: '', apiProviderRisk: '', mitigation: '' },
  saturationScore: { percentage: 0, reasoning: '' },
  redLineBlockers: [],
  legalMatrix: [],
  gorillaCompetitors: [],
  executionDifficulty: { score: 50, blockers: [] },
  pivotBuffer: { score: 5, runwayUnits: '', reasoning: '' },
  scenarioSimulator: [],
  notFound: []
});
export type Layer3 = z.infer<typeof layer3Schema>;

// ========== LAYER 4: COMPETITOR INTELLIGENCE ==========

export const failedCompetitorSchema = z.object({
  name: z.string().default(''),
  shutdownDate: z.string().default(''),
  funding: z.string().default(''),
  reason: z.string().default(''),
  lesson: z.string().default(''),
}).default({
  name: '',
  shutdownDate: '',
  funding: '',
  reason: '',
  lesson: '',
});
export type FailedCompetitor = z.infer<typeof failedCompetitorSchema>;

export const layer4Schema = z.object({
  userCompetitorVerdict: z.array(z.object({
    url: z.string().default(''),
    threatLevel: confidenceLevel,
    verdict: z.string().default(''),
  })).optional().default([]),
  competitors: z.array(z.object({
    name: z.string().default(''),
    url: z.string().optional().default(''),
    revenue: z.string().default(''),
    traffic: z.string().default(''),
    primaryMarketingPillar: z.string().default(''),
    pricing: z.string().default(''),
    pricingAnchors: z.array(z.string()).default([]),
    moatAudit: z.array(z.string()).default([]),
    strengths: z.array(z.string()).default([]),
    weaknesses: z.array(z.string()).default([]),
  })).default([]),
  differentiationVectors: z.array(z.object({
    vector: z.string().default(''),
    howToWin: z.string().default(''),
    priority: z.preprocess(
      (val) => String(val || 'secondary').toLowerCase(),
      z.enum(['primary', 'secondary'])
    ).catch('secondary'),
  })).default([]),
  missingCompetitors: z.array(z.string()).optional().default([]),
  failedCompetitors: z.array(failedCompetitorSchema).optional().default([]),
  marketGaps: z.array(citedClaim).default([]),
  seoWhiteSpace: z.array(z.object({ keyword: z.string().default(''), difficulty: z.string().default(''), opportunity: z.string().default('') })).default([]),
  pricingSpectrum: z.object({ low: z.string().default(''), mid: z.string().default(''), high: z.string().default(''), yourSweetSpot: z.string().default('') }).default({ low: '', mid: '', high: '', yourSweetSpot: '' }),
  substituteThreats: z.array(z.object({ substitute: z.string().default(''), linkedJob: z.string().default(''), risk: z.string().default('') })).default([]),
  competitorVelocity: z.array(z.object({ competitor: z.string().default(''), momentum: z.preprocess((val)=>String(val || 'stable').toLowerCase(), z.enum(['surging', 'stable', 'losing_ground'])).catch('stable'), direction: z.string().default('') })).default([]),
  notFound: z.array(z.string()).default([]),
}).default({
  userCompetitorVerdict: [],
  competitors: [],
  differentiationVectors: [],
  missingCompetitors: [],
  failedCompetitors: [],
  marketGaps: [],
  seoWhiteSpace: [],
  pricingSpectrum: { low: '', mid: '', high: '', yourSweetSpot: '' },
  substituteThreats: [],
  competitorVelocity: [],
  notFound: []
});
export type Layer4 = z.infer<typeof layer4Schema>;

// ========== LAYER 5: UNIT ECONOMICS ==========

export const layer5Schema = z.object({
  cacBenchmark: z.object({
    range: z.string().default(''),
    channelBreakdown: z.array(z.object({ channel: z.string().default(''), estCAC: z.string().default('') })).default([]),
    sources: z.array(z.coerce.string()).default([]),
    confidence: confidenceLevel,
  }).default({ range: '', channelBreakdown: [], sources: [], confidence: 'medium' }),
  ltvBenchmark: z.object({
    range: z.string().default(''),
    churnRate: z.string().default(''),
    nrrExpansionPotential: z.string().default(''),
    confidence: confidenceLevel,
  }).default({ range: '', churnRate: '', nrrExpansionPotential: '', confidence: 'medium' }),
  paybackPeriod: z.object({
    months: z.coerce.number().default(0),
    verdict: z.string().default(''),
  }).default({ months: 0, verdict: '' }),
  grossMarginHealth: z.object({
    marginPercentage: percentSchema,
    aiCogsEstimate: z.string().default(''),
    reasoning: z.string().default(''),
  }).default({ marginPercentage: 0, aiCogsEstimate: '', reasoning: '' }),
  ltvCacVerdict: z.object({
    ratio: z.string().default(''),
    verdict: z.string().default(''),
  }).default({ ratio: '', verdict: '' }),
  breakEven: z.object({
    timeline: z.string().default(''),
    assumptions: z.array(z.string()).default([]),
  }).default({ timeline: '', assumptions: [] }),
  runwaySensitivityMatrix: z.array(z.object({
    toggle: z.string().default(''),
    impactOnRunway: z.string().default(''),
  })).default([]),
  optimalPricePoint: z.object({
    price: z.string().default(''),
    reasoning: z.string().default(''),
  }).default({ price: '', reasoning: '' }),
  notFound: z.array(z.string()).default([]),
}).default({
  cacBenchmark: { range: '', channelBreakdown: [], sources: [], confidence: 'medium' },
  ltvBenchmark: { range: '', churnRate: '', nrrExpansionPotential: '', confidence: 'medium' },
  paybackPeriod: { months: 0, verdict: '' },
  grossMarginHealth: { marginPercentage: 0, aiCogsEstimate: '', reasoning: '' },
  ltvCacVerdict: { ratio: '', verdict: '' },
  breakEven: { timeline: '', assumptions: [] },
  runwaySensitivityMatrix: [],
  optimalPricePoint: { price: '', reasoning: '' },
  notFound: []
});
export type Layer5 = z.infer<typeof layer5Schema>;

// ========== LAYER 6: OFFER & GTM ==========

export const layer6Schema = z.object({
  offerIdeas: z.array(z.object({
    offer: z.string().default(''),
    pricingLogic: z.string().default(''),
    incentiveStacking: z.array(z.string()).default([]),
    confidence: confidenceLevel,
  })).default([]),
  unscalablePlaybook: z.array(z.object({
    tactic: z.string().default(''),
    actionableStep: z.string().default(''),
    expectedOutcome: z.string().default(''),
  })).default([]),
  gtmRoadmap: z.array(z.object({
    phase: z.string().default(''),
    focus: z.string().default(''),
    actions: z.array(z.string()).default([]),
    successMetrics: z.array(z.string()).default([]),
  })).default([]),
  creativeHooks: z.array(z.object({
    channel: z.string().default(''),
    hookTemplate: z.string().default(''),
    angle: z.string().default(''),
  })).default([]),
  growthLoops: z.array(z.object({
    loopType: z.string().default(''),
    mechanism: z.string().default(''),
    viralPotential: z.string().default(''),
  })).default([]),
  channelMap: z.array(z.object({
    channel: z.string().default(''),
    effectiveness: z.string().default(''),
    primaryMarketingPillar: z.string().optional().default(''),
  })).default([]),
  revenueModelFit: z.array(z.object({
    model: z.string().default(''),
    fit: z.string().default(''),
    reasoning: z.string().optional().default(''),
  })).default([]),
  notFound: z.array(z.string()).default([]),
}).default({
  offerIdeas: [],
  unscalablePlaybook: [],
  gtmRoadmap: [],
  creativeHooks: [],
  growthLoops: [],
  channelMap: [],
  revenueModelFit: [],
  notFound: []
});
export type Layer6 = z.infer<typeof layer6Schema>;

// ========== LAYER 7: ANTI-COMMODITISATION ==========

export const layer7Schema = z.object({
  counterPositioning: z.array(z.object({
    incumbentWeakness: z.string().default(''),
    userCounterStrategy: z.string().default(''),
    reasoning: z.string().default(''),
  })).default([]),
  moats: z.array(z.object({
    type: z.string().default(''),
    strategy: z.string().default(''),
    implementation: z.string().default(''),
    decayRisk: confidenceLevel,
    aiResilience: z.string().default(''),
    confidence: confidenceLevel,
  })).default([]),
  moatFlywheel: z.array(z.object({
    phase: z.string().default(''),
    moatFocus: z.string().default(''),
    howItScales: z.string().default(''),
  })).default([]),
  migrationFrictionScore: z.object({
    score: resilientScore10,
    frictionFactors: z.array(z.string()).default([]),
    verdict: z.string().default(''),
  }).default({ score: 0, frictionFactors: [], verdict: '' }),
  swotAnalysis: z.object({
    strengths: z.array(z.string()).default([]),
    weaknesses: z.array(z.string()).default([]),
    opportunities: z.array(z.string()).default([]),
    threats: z.array(z.string()).default([]),
  }).default({ strengths: [], weaknesses: [], opportunities: [], threats: [] }),
  notFound: z.array(z.string()).default([]),
}).default({
  counterPositioning: [],
  moats: [],
  moatFlywheel: [],
  migrationFrictionScore: { score: 0, frictionFactors: [], verdict: '' },
  swotAnalysis: { strengths: [], weaknesses: [], opportunities: [], threats: [] },
  notFound: []
});
export type Layer7 = z.infer<typeof layer7Schema>;

// ========== LAYER 8: PERSONA-SPECIFIC ==========

export const layer8Schema = z.object({
  modules: z.array(z.object({
    title: z.string().default(''),
    content: z.string().default(''),
    confidence: confidenceLevel,
    sources: z.array(z.coerce.string()).default([]),
  })).default([]),
  notFound: z.array(z.string()).default([]),
}).default({
  modules: [],
  notFound: []
});
export type Layer8 = z.infer<typeof layer8Schema>;

// ========== TRI-AGENT DEBATE ==========

export const agentVerdictSchema = z.object({
  score: resilientScore,
  signal: z.string().default('GO'),
  reasoning: z.string().default(''),
  keyPoints: z.array(z.string()).default([]),
}).default({ score: 50, signal: 'GO', reasoning: '', keyPoints: [] });
export type AgentVerdict = z.infer<typeof agentVerdictSchema>;

export const debateResultSchema = z.object({
  builder: agentVerdictSchema,
  cynic: agentVerdictSchema,
  operator: agentVerdictSchema,
  finalVerdict: z.string().default('Conditional Proceed'),
  compositeScore: resilientScore,
  clashPoints: z.array(z.string()).default([]),
  milestones: z.array(z.object({
    condition: z.string().default(''),
    action: z.string().default(''),
  })).default([]),
  primaryResearchRequirements: z.array(z.string()).optional().default([]),
  assumptionsLog: z.array(z.object({
    assumption: z.string().default(''),
    impactIfWrong: z.string().default(''),
    validationExperiment: z.string().default('')
  })).optional().default([]),
  contradictoryCertainty: z.boolean().optional().default(false),
}).default({
  builder: { score: 50, signal: 'GO', reasoning: '', keyPoints: [] },
  cynic: { score: 50, signal: 'GO', reasoning: '', keyPoints: [] },
  operator: { score: 50, signal: 'GO', reasoning: '', keyPoints: [] },
  finalVerdict: 'Conditional Proceed',
  compositeScore: 50,
  clashPoints: [],
  milestones: [],
  primaryResearchRequirements: [],
  assumptionsLog: [],
  contradictoryCertainty: false,
});
export type DebateResult = z.infer<typeof debateResultSchema>;

// ========== AUTO-PIVOT ==========

export const pivotOptionSchema = z.object({
  rank: z.string().default('1'),
  title: z.string().default('Pivot Option'),
  description: z.string().default(''),
  newSaturation: percentSchema,
  executionFit: z.string().default(''),
  reasoning: z.string().default(''),
}).default({
  rank: '1',
  title: 'Pivot Option',
  description: '',
  newSaturation: 0,
  executionFit: '',
  reasoning: '',
});
export type PivotOption = z.infer<typeof pivotOptionSchema>;

export const autoPivotSchema = z.object({
  triggered: z.boolean().default(false),
  reason: z.string().default(''),
  pivots: z.array(pivotOptionSchema).default([]),
}).default({ triggered: false, reason: '', pivots: [] });
export type AutoPivotResult = z.infer<typeof autoPivotSchema>;

// ========== META & FULL REPORT ==========

export interface ReportVerdict {
  label: 'GO' | 'PROCEED_WITH_CAUTION' | 'DO_NOT_PROCEED';
  reason: string;
  topBlockers: string[];
  recommendedAction: string;
  primaryResearchRequirements?: string[];
  assumptionsLog?: { assumption: string; impactIfWrong: string; validationExperiment: string }[];
}

export interface LayerReliabilityScore {
  totalDataPoints: number;
  highConfidence: number;
  mediumConfidence: number;
  lowConfidence: number;
  score: number; // 0-100
  verdict: 'RELIABLE' | 'DIRECTIONAL' | 'SPECULATIVE';
}

export interface ContentSuppression {
  gtmPlanSuppressed: boolean;
  moatStrategiesSuppressed: boolean;
  revenueProjectionsSuppressed: boolean;
  reason: string;
}

export interface FullReport {
  id: string;
  niche: string;
  persona: string;
  status: 'pending' | 'generating' | 'complete' | 'failed';
  layers: {
    layer1?: Layer1;
    layer2?: Layer2;
    layer3?: Layer3;
    layer4?: Layer4;
    layer5?: Layer5;
    layer6?: Layer6;
    layer7?: Layer7;
    layer8?: Layer8;
  };
  debate?: DebateResult;
  autoPivot?: AutoPivotResult;
  sources: { url: string; title: string; confidence: ConfidenceLevel }[];
  generatedAt: string;
  verdict?: ReportVerdict;
  fatalFlags?: string[];
  layerReliability?: Record<string, LayerReliabilityScore>;
  contentSuppressed?: ContentSuppression;
  executionLayersSuppressed?: boolean;
}
