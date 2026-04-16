import { z } from 'zod';

// -- Shared primitives --

export const confidenceLevel = z.preprocess(
  (val) => String(val).toLowerCase(),
  z.enum(['high', 'medium', 'low'])
).catch('medium');
export type ConfidenceLevel = z.infer<typeof confidenceLevel>;

export const citedClaim = z.object({
  claim: z.string(),
  source: z.coerce.string().optional(),
  confidence: confidenceLevel,
});
export type CitedClaim = z.infer<typeof citedClaim>;

// -- Layer 1: Audience Intelligence --

export const layer1Schema = z.object({
  painPoints: z.array(z.object({
    pain: z.string(),
    frequency: z.string(),
    emotionalIntensity: z.string(),
    wtpSignal: z.string(),
    source: z.string().optional(),
    confidence: confidenceLevel,
  })),
  buyerLanguage: z.array(z.object({
    quote: z.string(),
    source: z.string(),
    context: z.string(),
  })),
  purchaseTriggers: z.array(citedClaim),
  avatar: z.object({
    age: z.string(),
    income: z.string(),
    platforms: z.array(z.string()),
    identity: z.string(),
    selfNarrative: z.string(),
    trustedInfluencers: z.array(z.string()),
    contentConsumed: z.array(z.string()),
  }),
  hiddenObjections: z.array(citedClaim),
  desiresAndDreams: z.array(citedClaim),
  shadowAvatar: z.object({
    description: z.string(),
    whyTheyWontBuy: z.string(),
    howToExclude: z.string(),
  }),
  paymentThreshold: z.object({
    low: z.string(),
    mid: z.string(),
    high: z.string(),
    reasoning: z.string(),
  }),
  notFound: z.array(z.string()).optional(),
});
export type Layer1 = z.infer<typeof layer1Schema>;

// -- Layer 2: Market Intelligence --

export const layer2Schema = z.object({
  tam: z.object({ range: z.string(), confidence: confidenceLevel, sources: z.array(z.coerce.string()).optional().default([]) }),
  sam: z.object({ range: z.string(), confidence: confidenceLevel, sources: z.array(z.coerce.string()).optional().default([]) }),
  som: z.object({ range: z.string(), confidence: confidenceLevel, sources: z.array(z.coerce.string()).optional().default([]) }),
  trendTrajectory: z.object({
    direction: z.enum(['growing', 'stable', 'declining']),
    searchVolumeTrend: z.string(),
    socialVelocity: z.string(),
    fundingActivity: z.string(),
    mediaCoverage: z.string(),
  }),
  internationalOpportunity: z.object({
    bestAlternateMarket: z.string(),
    tamMultiplier: z.string(),
    competitionReduction: z.string(),
  }),
  adjacentMarkets: z.array(z.object({ market: z.string(), overlap: z.string(), opportunity: z.string() })),
  marketTimingVerdict: z.string(),
  sentimentVelocity: z.object({ overall: z.string(), trend: z.string() }),
  notFound: z.array(z.string()).optional(),
});
export type Layer2 = z.infer<typeof layer2Schema>;

// -- Layer 3: Survival Intelligence --

export const layer3Schema = z.object({
  dyingTrendSignals: z.array(citedClaim),
  aiDisruptionRisk: z.object({
    score: z.number().min(0).max(10),
    threateningModel: z.string(),
    valueAtRisk: z.string(),
    confidence: confidenceLevel,
  }),
  platformDependency: z.object({
    score: z.number().min(0).max(10),
    primaryPlatform: z.string(),
    risk: z.string(),
  }),
  saturationScore: z.object({
    percentage: z.number().min(0).max(100),
    reasoning: z.string(),
  }),
  legalMatrix: z.array(z.object({
    jurisdiction: z.string(),
    status: z.string(),
    risk: z.string(),
  })),
  gorillaCompetitors: z.array(z.object({
    name: z.string(),
    threat: z.string(),
    defence: z.string(),
  })),
  executionDifficulty: z.object({
    score: z.number().min(0).max(100),
    blockers: z.array(z.string()),
  }),
  scenarioSimulator: z.array(z.object({
    threat: z.string(),
    probability: z.string(),
    consequence: z.string(),
  })),
  notFound: z.array(z.string()).optional(),
});
export type Layer3 = z.infer<typeof layer3Schema>;

// -- Layer 4: Competitor Intelligence --

export const layer4Schema = z.object({
  userCompetitorVerdict: z.string().optional(),
  competitors: z.array(z.object({
    name: z.string(),
    url: z.string().optional(),
    estimatedRevenue: z.string(),
    traffic: z.string(),
    pricing: z.string(),
    strengths: z.array(z.string()),
    weaknesses: z.array(z.string()),
  })),
  marketGaps: z.array(citedClaim),
  seoWhiteSpace: z.array(z.object({ keyword: z.string(), difficulty: z.string(), opportunity: z.string() })),
  pricingSpectrum: z.object({ low: z.string(), mid: z.string(), high: z.string(), yourSweetSpot: z.string() }),
  substituteThreats: z.array(z.object({ substitute: z.string(), risk: z.string() })),
  competitorVelocity: z.array(z.object({ competitor: z.string(), momentum: z.string(), direction: z.string() })),
  notFound: z.array(z.string()).optional(),
});
export type Layer4 = z.infer<typeof layer4Schema>;

// -- Layer 5: Unit Economics --

export const layer5Schema = z.object({
  cacBenchmark: z.object({ range: z.string(), sources: z.array(z.coerce.string()).optional().default([]), confidence: confidenceLevel }),
  ltvBenchmark: z.object({ range: z.string(), churnRate: z.string(), confidence: confidenceLevel }),
  ltvCacVerdict: z.object({ ratio: z.string(), verdict: z.string() }),
  breakEven: z.object({ timeline: z.string(), assumptions: z.array(z.string()) }),
  burnRateScenarios: z.array(z.object({ scenario: z.string(), monthlyBurn: z.string(), runway: z.string() })),
  optimalPricePoint: z.object({ price: z.string(), reasoning: z.string() }),
  notFound: z.array(z.string()).optional(),
});
export type Layer5 = z.infer<typeof layer5Schema>;

// -- Layer 6: Offer & GTM --

export const layer6Schema = z.object({
  offerIdeas: z.array(z.object({ offer: z.string(), pricingLogic: z.string(), confidence: confidenceLevel })),
  gtmPlan: z.array(z.object({ week: z.string(), action: z.string(), cost: z.string() })),
  platformHooks: z.array(z.object({ platform: z.string(), hook: z.string(), angle: z.string() })),
  channelMap: z.array(z.object({ channel: z.string(), effectiveness: z.string(), decaySignal: z.string() })),
  validationRoadmap: z.array(z.object({ step: z.string(), cost: z.string(), expectedOutcome: z.string() })),
  futureTrends: z.array(z.object({ trend: z.string(), trigger: z.string(), timing: z.string() })),
  distributionLeverage: z.array(z.object({ lever: z.string(), description: z.string() })),
  revenueModelFit: z.array(z.object({ model: z.string(), fit: z.string(), reasoning: z.string().optional().default('') })),
  notFound: z.array(z.string()).optional(),
});
export type Layer6 = z.infer<typeof layer6Schema>;

// -- Layer 7: Anti-Commoditisation --

export const layer7Schema = z.object({
  moats: z.array(z.object({
    type: z.string(),
    strategy: z.string(),
    implementation: z.string(),
    timeToEffect: z.string(),
  })),
  notFound: z.array(z.string()).optional(),
});
export type Layer7 = z.infer<typeof layer7Schema>;

// -- Layer 8: Persona-Specific --

export const layer8Schema = z.object({
  modules: z.array(z.object({
    title: z.string(),
    content: z.string(),
    confidence: confidenceLevel,
    sources: z.array(z.coerce.string()).optional().default([]),
  })),
  notFound: z.array(z.string()).optional(),
});
export type Layer8 = z.infer<typeof layer8Schema>;

// -- Tri-Agent Debate --

export const agentVerdictSchema = z.object({
  score: z.number().min(0).max(100),
  signal: z.string(),
  reasoning: z.string(),
  keyPoints: z.array(z.string()),
});
export type AgentVerdict = z.infer<typeof agentVerdictSchema>;

export const debateResultSchema = z.object({
  builder: agentVerdictSchema,
  cynic: agentVerdictSchema,
  operator: agentVerdictSchema,
  finalVerdict: z.string(),
  compositeScore: z.number().min(0).max(100),
});
export type DebateResult = z.infer<typeof debateResultSchema>;

// -- Auto-Pivot --

export const pivotOptionSchema = z.object({
  rank: z.string(),
  title: z.string(),
  description: z.string(),
  newSaturation: z.number().min(0).max(100),
  executionFit: z.string(),
  reasoning: z.string(),
});

export const autoPivotSchema = z.object({
  triggered: z.boolean(),
  reason: z.string(),
  pivots: z.array(pivotOptionSchema),
});
export type AutoPivotResult = z.infer<typeof autoPivotSchema>;

// -- Full Report --

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
}
