import { tavily } from '@tavily/core';

const tavilyKeys = [
  process.env.TAVILY_API_KEY,
  process.env.TAVILY_API_KEY_2,
  process.env.TAVILY_API_KEY_3,
].filter(Boolean) as string[];

if (tavilyKeys.length === 0) tavilyKeys.push('dummy_tavily');

const tvlyClients = tavilyKeys.map(k => tavily({ apiKey: k }));

// -- Credit Tracking System --
const globalTavilyStore = globalThis as unknown as { monthlyCreditUsage: number };
if (typeof globalTavilyStore.monthlyCreditUsage === 'undefined') {
  globalTavilyStore.monthlyCreditUsage = 0;
}
const TAVILY_MONTHLY_LIMIT = 1000;

function trackTavilyUsage(credits: number) {
  globalTavilyStore.monthlyCreditUsage += credits;
  if (globalTavilyStore.monthlyCreditUsage > TAVILY_MONTHLY_LIMIT * 0.9) {
    console.warn(`[Tavily] Usage Warning: Reached ${globalTavilyStore.monthlyCreditUsage} / ${TAVILY_MONTHLY_LIMIT} requests.`);
  }
}

/**
 * Common wrapper to catch errors and trace usage natively
 */
async function tavilySearch(query: string, options?: any) {
  const depth = options?.searchDepth || 'basic';
  trackTavilyUsage(depth === 'advanced' ? 2 : 1);
  let clientIndex = Math.floor(Math.random() * tvlyClients.length);
  const maxAttempts = tvlyClients.length;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      const response = await tvlyClients[clientIndex].search(query, {
        searchDepth: 'basic',
        includeImages: false,
        includeRawContent: false,
        ...options,
      });
      return response as any; // Cast as any to allow dynamic access to answer/results
    } catch (error) {
      console.warn(`[Tavily API] Failed on query: "${query}" using key index ${clientIndex}.`);
      clientIndex = (clientIndex + 1) % tvlyClients.length;
    }
  }
  
  console.error(`[Tavily API] All keys exhausted for query: "${query}"`);
  return { results: [], answer: '' }; // Added answer to fallback
}

// -- Research Domains --

export async function searchMarket(niche: string, geography: string) {
  const query = `${niche} market size TAM SAM growth rate 2024 2025 in ${geography}`;
  const response = await tavilySearch(query, { includeAnswer: true, searchDepth: 'advanced', timeRange: 'year', topic: 'finance' });
  return { answer: response.answer, results: response.results };
}

export async function searchCompetitors(niche: string, geography?: string) {
  const geoClause = geography ? ` in ${geography}` : '';
  const query = `top competitors pricing features for ${niche}${geoClause}`;
  const response = await tavilySearch(query, { maxResults: 5 });
  return { results: response.results };
}

export async function searchPainPoints(niche: string, sources: string[], geography?: string) {
  const domains = sources.length > 0 ? sources : ["reddit.com", "quora.com", "trustpilot.com"];
  const geoClause = geography ? ` in ${geography}` : '';
  const query = `biggest complaints pain points negative reviews "${niche}"${geoClause}`;
  
  const response = await tavilySearch(query, {
    includeDomains: domains,
    maxResults: 7,
    searchDepth: 'advanced',
  });
  return { results: response.results };
}

export async function searchTrends(keywords: string) {
  const query = `${keywords} trend velocity sentiment analysis future outlook`;
  const response = await tavilySearch(query, { includeAnswer: true, maxResults: 3, timeRange: 'year', topic: 'news' });
  return { answer: response.answer, results: response.results };
}

export async function searchRegulations(niche: string, geography: string) {
  const query = `${niche} legal regulations compliance risks in ${geography}`;
  const response = await tavilySearch(query, { includeAnswer: true, maxResults: 3, includeRawContent: 'markdown' });
  return { answer: response.answer, results: response.results };
}

export async function extractPage(url: string, niche?: string) {
  trackTavilyUsage(1); // Extract costs credits too
  let clientIndex = Math.floor(Math.random() * tvlyClients.length);
  const maxAttempts = tvlyClients.length;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      return await tvlyClients[clientIndex].extract([url], {
        ...(niche ? { query: `${niche} pricing features customers reviews` } : {}),
      });
    } catch (error) {
      console.warn(`[Tavily Extract] Failed for ${url} using key index ${clientIndex}`);
      clientIndex = (clientIndex + 1) % tvlyClients.length;
    }
  }

  console.error(`[Tavily Extract] All keys exhausted for URL: ${url}`);
  return null;
}
