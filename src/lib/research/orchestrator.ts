import * as tavily from './tavily';
import * as serper from './serper';

type IntakeData = {
  niche: string;
  geography: string;
  stage: string;
  budget: string;
  timeCommitment: string;
  assets: string[];
  competitorUrls: string[];
  complaintPlatforms: string[];
};

export type ResearchData = {
  marketSize: string[];
  competitors: string[];
  painPoints: string[];
  trends: string[];
  regulations: string[];
  sources: { url: string; title: string, confidence: 'high' | 'medium' | 'low' }[];
};

/**
 * Orchestrates all parallel research gathering tasks
 */
export async function gatherIntelligence(intake: IntakeData): Promise<ResearchData> {
  // Start parallel requests
  console.log(`[Orchestrator] Firing parallel intel queries for ${intake.niche}...`);

  // Map display names to actual domains for Tavily's includeDomains filter
  const platformToDomain: Record<string, string> = {
    'Reddit': 'reddit.com',
    'G2 Reviews': 'g2.com',
    'Trustpilot': 'trustpilot.com',
    'X / Twitter': 'x.com',
    'Facebook Groups': 'facebook.com',
    'Yelp': 'yelp.com',
    'LinkedIn': 'linkedin.com',
    'Quora': 'quora.com',
    'HackerNews': 'news.ycombinator.com',
  };

  const complaintDomains = intake.complaintPlatforms
    .map(p => platformToDomain[p] || p)
    .filter(d => d.includes('.'));  // Only keep valid-looking domains

  const [marketRes, compRes, painRes, trendRes, regRes, googleFallback] = await Promise.all([
    tavily.searchMarket(intake.niche, intake.geography),
    tavily.searchCompetitors(intake.niche),
    tavily.searchPainPoints(intake.niche, complaintDomains),
    tavily.searchTrends(intake.niche),
    tavily.searchRegulations(intake.niche, intake.geography),
    serper.googleSearch(`${intake.niche} software solutions ${intake.geography}`) // Fallback/Supplemental
  ]);

  // Aggregate Raw Strings (for LLM Context)
  const marketSize = [marketRes?.answer, ...(marketRes?.results?.map((r: any) => r.content) || [])].filter(Boolean) as string[];
  const competitors = [compRes?.results?.map((r: any) => r.content)].flat().filter(Boolean);
  const painPoints = [painRes?.results?.map((r: any) => r.content)].flat().filter(Boolean);
  const trends = [trendRes?.answer, ...(trendRes?.results?.map((r: any) => r.content) || [])].filter(Boolean) as string[];
  const regulations = [regRes?.answer, ...(regRes?.results?.map((r: any) => r.content) || [])].filter(Boolean) as string[];

  // Merge and Deduplicate Source URLs
  const rawSources = [
    ...(marketRes?.results || []),
    ...(compRes?.results || []),
    ...(painRes?.results || []),
    ...(trendRes?.results || []),
    ...(regRes?.results || []),
    ...(googleFallback || []).map((g: any) => ({ url: g.link, title: g.title, score: 0.5 }))
  ];

  const uniqueUrls = new Set<string>();
  const finalizedSources: { url: string; title: string; confidence: 'high'|'medium'|'low' }[] = [];

  for (const src of rawSources) {
    if (!src || !src.url) continue;
    
    // Normalize URL to deduplicate (strip trailing slashes, tracking params)
    const cleanUrl = src.url.split('?')[0].replace(/\/$/, "");
    
    if (!uniqueUrls.has(cleanUrl)) {
      uniqueUrls.add(cleanUrl);
      
      // Basic heuristic for source confidence 
      // In production, cross-reference highly respected domains (statista, gartner, gov)
      let confidence: 'high' | 'medium' | 'low' = 'low';
      if (cleanUrl.includes('.gov') || cleanUrl.includes('.edu') || cleanUrl.includes('statista') || cleanUrl.includes('mckinsey') || cleanUrl.includes('gartner')) {
        confidence = 'high';
      } else if (src.score && src.score > 0.8) {
        confidence = 'medium';
      } else if (cleanUrl.includes('reddit') || cleanUrl.includes('quora')) {
        // High confidence for pain points, but we classify the domain authority inherently
        confidence = 'medium'; 
      }

      finalizedSources.push({
        url: cleanUrl,
        title: src.title || cleanUrl,
        confidence
      });
    }
  }

  console.log(`[Orchestrator] Captured ${finalizedSources.length} unique sources.`);
  
  return {
    marketSize,
    competitors,
    painPoints,
    trends,
    regulations,
    sources: finalizedSources
  };
}
