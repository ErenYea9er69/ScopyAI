import OpenAI from 'openai';
import { z } from 'zod';

// Ensure this environment variable is set
const apiKey = process.env.LONGCAT_API_KEY || 'dummy-key';

export const openai = new OpenAI({
  baseURL: 'https://api.longcat.chat/v1',
  apiKey: apiKey,
});

// Model Constants
export const MODELS = {
  REASONING: 'LongCat-Flash-Thinking-2601', // Heavy lifting, debate, layer analysis
  ROUTER: 'LongCat-Flash-Lite',             // Fast tasks, persona routing, JSON formatting
};

// -- Token Tracking System --
// In a real app, this syncs with Supabase/Redis. We maintain local fallback here.
let dailyTokenUsage = 0;
const DAILY_LIMIT = 500_000;

export function trackTokenUsage(tokens: number) {
  dailyTokenUsage += tokens;
  if (dailyTokenUsage > DAILY_LIMIT * 0.9) {
    console.warn(`[LongCat] Token Warning: Reached ${dailyTokenUsage} / ${DAILY_LIMIT}`);
  }
}

export function getCurrentUsage() {
  return dailyTokenUsage;
}

// -- Generative Helpers --

/**
 * Generates Zod-validated JSON from LongCat with Exponential Backoff
 */
export async function generateStructuredOutput<T>(
  systemPrompt: string,
  userPrompt: string,
  schema: z.ZodSchema<T>,
  model: string = MODELS.REASONING,
  maxRetries = 3
): Promise<T> {
  let attempts = 0;
  
  if (dailyTokenUsage >= DAILY_LIMIT) {
    throw new Error('Daily token usage limit exceeded');
  }
  
  while (attempts <= maxRetries) {
    try {
      const response = await openai.chat.completions.create({
        model,
        messages: [
          { role: 'system', content: `${systemPrompt}\n\nIMPORTANT: You must output ONLY raw, valid JSON that tightly matches the requested schema. Do not wrap in markdown tags like \`\`\`json.` },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.1, 
      });

      // Track usage
      if (response.usage) {
        trackTokenUsage(response.usage.total_tokens);
      }

      const content = response.choices[0]?.message?.content || '{}';
      const cleanJson = content.replace(/```json/gi, '').replace(/```/g, '').trim();
      
      const parsed = JSON.parse(cleanJson);
      return schema.parse(parsed);
      
    } catch (error: any) {
      attempts++;
      console.warn(`[LongCat API] Attempt ${attempts} failed:`, error?.message || error);
      
      if (attempts > maxRetries) {
        console.error('[LongCat API] Max retries reached. Graceful fallback activated.');
        throw new Error('LLM failed to generate valid structured output.');
      }
      
      // Exponential backoff
      await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, attempts)));
    }
  }
  
  throw new Error('Failed to generate structured output after max retries.');
}

/**
 * Streams generic reasoning responses (used for live progress streaming)
 */
export async function streamThinkingResponse(
  systemPrompt: string,
  userPrompt: string,
  model: string = MODELS.REASONING
) {
  return await openai.chat.completions.create({
    model,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ],
    temperature: 0.7,
    stream: true,
  });
}
