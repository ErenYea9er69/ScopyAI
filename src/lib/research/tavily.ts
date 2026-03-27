import { tavily } from '@tavily/core';

const TAVILY_API_KEY = process.env.TAVILY_API_KEY || 'dummy_tavily';
const tvly = tavily({ apiKey: TAVILY_API_KEY });

// -- Credit Tracking System --
let monthlyCreditUsage = 0;
const TAVILY_MONTHLY_LIMIT = 1000;

function trackTavilyUsage(credits: number) {
  monthlyCreditUsage += credits;
  if (monthlyCreditUsage > TAVILY_MONTHLY_LIMIT * 0.9) {
    console.warn(`[Tavily] Usage Warning: Reached ${monthlyCreditUsage} / ${TAVILY_MONTHLY_LIMIT} requests.`);
  }
}

/**
 * Common wrapper to catch errors and trace usage natively
 */
async function tavilySearch(query: string, options?: any) {
  trackTavilyUsage(1);
  try {
    const response = await tvly.search(query, {
      searchDepth: 'advanced',
      includeImages: false,
      includeRawContent: false,
      ...options,
    });
    return response as any; // Cast as any to allow dynamic access to answer/results
  } catch (error) {
    console.error(`[Tavily API] Failed on query: "${query}"`, error);
    return { results: [], answer: '' }; // Added answer to fallback
  }
}

// -- Research Domains --

export async function searchMarket(niche: string, geography: string) {
  const query = `${niche} market size TAM SAM growth rate 2024 2025 in ${geography}`;
  const response = await tavilySearch(query, { includeAnswer: true });
  return { answer: response.answer, results: response.results };
}

export async function searchCompetitors(niche: string) {
  const query = `top competitors pricing features for ${niche}`;
  const response = await tavilySearch(query, { maxResults: 5 });
  return { results: response.results };
}

export async function searchPainPoints(niche: string, sources: string[]) {
  // E.g., sources = ["reddit.com", "ycombinator.com", "trustpilot.com"]
  const domains = sources.length > 0 ? sources : ["reddit.com", "quora.com", "trustpilot.com"];
  const query = `biggest complaints pain points negative reviews "${niche}"`;
  
  const response = await tavilySearch(query, {
    includeDomains: domains,
    maxResults: 7,
    searchDepth: 'basic', // Basic depth is often enough for forum snippets
  });
  return { results: response.results };
}

export async function searchTrends(keywords: string) {
  const query = `${keywords} trend velocity sentiment analysis future outlook`;
  const response = await tavilySearch(query, { includeAnswer: true, maxResults: 3 });
  return { answer: response.answer, results: response.results };
}

export async function searchRegulations(niche: string, geography: string) {
  const query = `${niche} legal regulations compliance risks in ${geography}`;
  const response = await tavilySearch(query, { includeAnswer: true, maxResults: 3 });
  return { answer: response.answer, results: response.results };
}

export async function extractPage(url: string) {
  trackTavilyUsage(1); // Extract costs credits too
  try {
    return await tvly.extract([url]);
  } catch (error) {
    console.warn(`[Tavily Extract] Failed for ${url}`);
    return null;
  }
}
