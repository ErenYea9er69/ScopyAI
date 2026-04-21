import { z } from 'zod';

export const intakeSchema = z.object({
  niche: z.string().min(5, 'Niche description must be at least 5 characters'),
  geography: z.string().min(1, 'Geography is required'),
  stage: z.string().min(1, 'Business stage is required'),
  budget: z.string().default(''),
  timeCommitment: z.string().default(''),
  assets: z.array(z.string()).default([]),
  competitorUrls: z.array(z.string()).default([]),
  complaintPlatforms: z.array(z.string()).default([]),
  founderFit: z.array(z.string()).default([]),
  goalTimeline: z.string().default(''),
  uniqueInsight: z.string().default(''),
  acquisitionChannel: z.string().default(''),
  buyerType: z.string().default(''),
  revenueModel: z.string().default(''),
  whyNow: z.string().default(''),
  researchObjectives: z.array(z.string()).default([]),
});

export type IntakeInput = z.infer<typeof intakeSchema>;
