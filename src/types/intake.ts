import { z } from 'zod';

export const intakeSchema = z.object({
  niche: z.string().min(5, 'Niche description must be at least 5 characters'),
  geo: z.string().min(1, 'Geography is required'),
  stage: z.string().min(1, 'Business stage is required'),
  budget: z.string().default(''),
  time: z.string().default(''),
  assets: z.array(z.string()).default([]),
  urls: z.string().default(''),
  sources: z.array(z.string()).default([]),
  fit: z.array(z.string()).default([]),
});

export type IntakeInput = z.infer<typeof intakeSchema>;
