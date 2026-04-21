import OpenAI from 'openai';
import { z } from 'zod';

// LongCat API Configuration — reads from .env.local
const baseURL = process.env.LONGCAT_BASE_URL || 'https://api.longcat.chat/openai/v1';

const longCatKeys = [
  process.env.LONGCAT_API_KEY,
  process.env.LONGCAT_API_KEY_2,
  process.env.LONGCAT_API_KEY_3,
  process.env.LONGCAT_API_KEY_4,
  process.env.LONGCAT_API_KEY_5,
].filter(Boolean) as string[];

if (longCatKeys.length === 0) longCatKeys.push('dummy-key');

export const openaiClients = longCatKeys.map(key => new OpenAI({
  baseURL,
  apiKey: key,
  timeout: 120000,
}));

export function getRandomClient() {
  return openaiClients[Math.floor(Math.random() * openaiClients.length)];
}

export const openai = openaiClients[0];

// Model Constants — override via env if they change
export const MODELS = {
  REASONING: process.env.LONGCAT_MODEL_REASONING || 'LongCat-Flash-Thinking-2601',
  ROUTER: process.env.LONGCAT_MODEL_ROUTER || 'LongCat-Flash-Lite',
};

console.log(`[LongCat] Configured: baseURL=${baseURL}, reasoning=${MODELS.REASONING}, router=${MODELS.ROUTER}`);

// -- Token Tracking System --
// In a real app, this syncs with Supabase/Redis. We maintain local fallback here.
const globalTokenStore = globalThis as unknown as { dailyTokenUsage: number };
if (typeof globalTokenStore.dailyTokenUsage === 'undefined') {
  globalTokenStore.dailyTokenUsage = 0;
}
const DAILY_LIMIT = 500_000;

export function trackTokenUsage(tokens: number) {
  globalTokenStore.dailyTokenUsage += tokens;
  if (globalTokenStore.dailyTokenUsage > DAILY_LIMIT * 0.9) {
    console.warn(`[LongCat] Token Warning: Reached ${globalTokenStore.dailyTokenUsage} / ${DAILY_LIMIT}`);
  }
}

export function getCurrentUsage() {
  return globalTokenStore.dailyTokenUsage;
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
  maxRetries = 5
): Promise<T> {
  let attempts = 0;
  
  if (getCurrentUsage() >= DAILY_LIMIT) {
    throw new Error('Daily token usage limit exceeded');
  }
  
  let currentMessages: any[] = [
    { role: 'system', content: `${systemPrompt}\n\nIMPORTANT: You must output ONLY raw, valid JSON that tightly matches the requested schema. Do not wrap in markdown tags like \`\`\`json.` },
    { role: 'user', content: userPrompt }
  ];

  let lastGeneratedContent = '';
  let clientIndex = Math.floor(Math.random() * openaiClients.length);

  while (attempts <= maxRetries) {
    try {
      const response = await openaiClients[clientIndex].chat.completions.create({
        model,
        messages: currentMessages,
        temperature: 0.1, 
        response_format: { type: 'json_object' }
      });

      // Track usage
      if (response.usage) {
        trackTokenUsage(response.usage.total_tokens);
      }

      let content = response.choices[0]?.message?.content || '{}';
      lastGeneratedContent = content;
      
      // Strip <think> tags if present
      content = content.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
      
      const cleanJson = content.replace(/```json/gi, '').replace(/```/g, '').trim();
      
      const parsed = JSON.parse(cleanJson);
      const result = schema.parse(parsed);
      
      // === ZOMBIE DEFAULT DETECTOR ===
      // Zod .default() silently fills missing fields with defaults.
      // If the LLM returned an empty/malformed response, Zod will produce
      // a result where ALL fields are defaults (empty strings, score: 50, etc.).
      // This is the root cause of the "sham debate" bug (50/50/50 scores).
      if (isZombieDefault(parsed)) {
        throw new Error('ZOMBIE_DEFAULT: LLM returned empty/malformed JSON that was silently filled by Zod defaults. The response has no real content. Retrying with explicit schema guidance.');
      }
      
      return result;
      
    } catch (error: any) {
      attempts++;
      console.warn(`[LongCat API] Attempt ${attempts} failed on key index ${clientIndex}:`, error?.message || error);
      
      // Rotate to the next client in the pool automatically
      clientIndex = (clientIndex + 1) % openaiClients.length;
      
      if (attempts > maxRetries) {
        console.error('[LongCat API] Max retries reached. Graceful fallback activated.');
        throw new Error('LLM failed to generate valid structured output.');
      }
      
      // Feedback to LLM with detailed Zod error paths
      let errorMessage = error?.message || String(error);
      if (error instanceof z.ZodError) {
        const issues = error.issues.map(i => `${i.path.join('.')}: ${i.message}`).join('\n');
        errorMessage = `JSON Validation failed with these issues:\n${issues}`;
      }

      currentMessages.push({ role: 'assistant', content: lastGeneratedContent || '{}' });
      currentMessages.push({ role: 'user', content: `${errorMessage}. Please fix the JSON output to strictly match the schema. Respond ONLY with the corrected JSON.` });

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
  const client = getRandomClient();
  return await client.chat.completions.create({
    model,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ],
    temperature: 0.7,
    stream: true,
  });
}

/**
 * Detects "zombie defaults" — objects where the LLM returned empty/malformed JSON
 * and Zod silently filled everything with .default() values.
 * 
 * Heuristic: If >80% of string values in the top-level object are empty strings,
 * and the object has fields like "score", "signal", "reasoning" (agent verdict pattern),
 * it's almost certainly a zombie default from a failed parse.
 */
function isZombieDefault(parsed: any): boolean {
  if (!parsed || typeof parsed !== 'object') return false;
  
  const keys = Object.keys(parsed);
  if (keys.length === 0) return true; // completely empty
  
  let emptyStringCount = 0;
  let totalStringFields = 0;
  let hasDefaultScore = false;
  
  for (const key of keys) {
    const val = parsed[key];
    if (typeof val === 'string') {
      totalStringFields++;
      if (val === '') emptyStringCount++;
    }
    // Detect the specific agent verdict zombie pattern
    if (key === 'score' && val === 50) hasDefaultScore = true;
    if (key === 'reasoning' && val === '') hasDefaultScore = true;
  }
  
  // Pattern 1: Agent verdict with default score + empty reasoning
  if (hasDefaultScore && parsed.reasoning === '' && parsed.signal === 'GO') {
    return true;
  }
  
  // Pattern 2: >80% empty strings on an object with 3+ string fields
  if (totalStringFields >= 3 && emptyStringCount / totalStringFields > 0.8) {
    return true;
  }
  
  return false;
}
