import { z } from 'zod';
import { generateStructuredOutput, MODELS } from './client';

export type Archetype = 'dev' | 'marketer' | 'creator' | 'consultant' | 'general';

export interface PersonaConfig {
  archetype: Archetype;
  confidence: number;
  reasoning: string;
}

const personaSchema = z.object({
  archetype: z.enum(['dev', 'marketer', 'creator', 'consultant', 'general']),
  confidence: z.number().min(0).max(100),
  reasoning: z.string()
});

/**
 * 
 * Routes a new idea into one of 5 distinct builder Archetypes based 
 * on their assets, budget, time, and keywords.
 * 
 * Uses LongCat-Lite for speed and cost efficiency.
 */
export async function routePersona(intakeData: {
  niche: string;
  assets: string[];
  budget: string;
  time: string;
  stage: string;
}): Promise<PersonaConfig> {
  
  const systemPrompt = `
You are the Persona Router for MarketPulse Intelligence Engine.
Your job is to classify the user into one of 5 archetypes based on their intake form data.

Archetype Definitions:
1. 'dev' - Technical background. Software engineering, building tools, APIs, open-source.
2. 'marketer' - Growth background. Agencies, SEO, performance marketing, high-converting copy.
3. 'creator' - Audience background. Communities, newsletters, content creation, brand building.
4. 'consultant' - B2B advisory background. White-glove services, expertise, corporate coaching.
5. 'general' - Side hustle, physical product, career pivot, or ambiguous mix. Default fallback.

Given the JSON payload of their input, respond strictly with valid JSON exactly matching this structure (no markdown wrappers):
{
  "archetype": "dev|marketer|creator|consultant|general",
  "confidence": 0,
  "reasoning": "short 1 sentence why this fits best"
}
`.trim();

  const userPrompt = JSON.stringify(intakeData, null, 2);

  try {
    const result = await generateStructuredOutput(
      systemPrompt, 
      userPrompt, 
      personaSchema,
      MODELS.ROUTER, // Use fast model
      2 // Retry max 2 times
    );
    
    return result;
  } catch (err) {
    console.warn('[Persona Router] LLM failed to classify. Defaulting to general.', err);
    return {
      archetype: 'general',
      confidence: 50,
      reasoning: 'Fallback classification due to routing error.'
    };
  }
}

/**
 * Returns the specific display configuration required for the frontend
 * after the archetype has been detected.
 */
export function getPersonaDisplayConfig(archetype: Archetype) {
  switch (archetype) {
    case 'dev': return {
      heroText: "Evaluate API surface, OSS risks, and GitHub developer velocity.",
      color: "bg-accent-2",
      icon: "💻"
    };
    case 'marketer': return {
      heroText: "Tear down ad libraries, funnels, and ROAS opportunities.",
      color: "bg-accent-4",
      icon: "📈"
    };
    case 'creator': return {
      heroText: "Audit platform decay, sponsorship arbitrage, and audience leakage.",
      color: "bg-accent-3",
      icon: "📸"
    };
    case 'consultant': return {
      heroText: "Map high-ticket B2B pain gaps and corporate purchase friction.",
      color: "bg-[#64AAFF]",
      icon: "🤝"
    };
    default: return {
      heroText: "Analyse hyper-local competition and execution requirements.",
      color: "bg-accent-5",
      icon: "🛠️"
    };
  }
}
