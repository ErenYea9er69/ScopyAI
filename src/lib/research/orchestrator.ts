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
  goalTimeline: string;
};

export type ResearchData = {
  marketSize: string[];
  competitors: string[];
  painPoints: string[];
  trends: string[];
  regulations: string[];
  unitEconomics: string[];
  sources: { url: string; title: string, confidence: 'high' | 'medium' | 'low' }[];
  researchQuality: {
    marketDataFound: boolean;
    competitorDataFound: boolean;
    painPointDataFound: boolean;
    trendDataFound: boolean;
    regulationDataFound: boolean;
    unitEconomicsDataFound: boolean;
    totalSources: number;
    summary: string;
  };
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

  const [marketRes, compRes, painRes, trendRes, regRes, econRes, googleFallback] = await Promise.all([
    tavily.searchMarket(intake.niche, intake.geography),
    tavily.searchCompetitors(intake.niche, intake.geography),
    tavily.searchPainPoints(intake.niche, complaintDomains, intake.geography),
    tavily.searchTrends(intake.niche),
    tavily.searchRegulations(intake.niche, intake.geography),
    tavily.searchUnitEconomics(intake.niche, intake.geography),
    serper.googleSearch(`${intake.niche} software solutions ${intake.geography}`) // Fallback/Supplemental
  ]);

  // === CONDITIONAL RE-SEARCH: If first pass returned sparse data, try harder ===
  let marketRes2: any = null;
  let compRes2: any = null;
  let painRes2: any = null;

  const marketEmpty = !marketRes?.results?.length;
  const compEmpty = !compRes?.results?.length;
  const painEmpty = !painRes?.results?.length;

  if (marketEmpty || compEmpty || painEmpty) {
    console.log(`[Orchestrator] Sparse data detected (market=${!marketEmpty}, comp=${!compEmpty}, pain=${!painEmpty}). Firing re-search...`);

    const reSearchPromises: Promise<any>[] = [];

    if (marketEmpty) {
      // Try alternative query formulations
      reSearchPromises.push(
        tavily.searchMarket(`${intake.niche} industry report revenue`, intake.geography)
          .then(r => { marketRes2 = r; })
      );
    }
    if (compEmpty) {
      // Try without geography (broader search)
      reSearchPromises.push(
        tavily.searchCompetitors(intake.niche)
          .then(r => { compRes2 = r; })
      );
    }
    if (painEmpty) {
      // Try broader complaint platforms
      reSearchPromises.push(
        tavily.searchPainPoints(intake.niche, ['reddit.com', 'producthunt.com', 'news.ycombinator.com', 'capterra.com'])
          .then(r => { painRes2 = r; })
      );
    }

    await Promise.all(reSearchPromises);
    console.log(`[Orchestrator] Re-search complete. Market=${!!marketRes2}, Comp=${!!compRes2}, Pain=${!!painRes2}`);
  }

  const competitorExtractions = await Promise.all(
    (intake.competitorUrls || []).filter(u => u.trim()).map(url => tavily.extractPage(url, intake.niche))
  );

  const extractedCompetitorsContext = competitorExtractions
    .filter(Boolean)
    .flatMap((ex: any) => ex?.results?.map((r: any) => {
      const url = r?.url || 'user-provided';
      const title = r?.title || '';
      const content = r?.rawContent || r?.content || '';
      return `[SOURCE: ${url} | ${title}] ${content}`;
    }) || []);

  // Helper: format a Tavily result with URL attribution
  const fmt = (r: any): string => {
    const url = r?.url || 'unknown';
    const title = r?.title || '';
    const content = r?.content || r?.rawContent || '';
    return `[SOURCE: ${url} | ${title}] ${content}`;
  };

  // Aggregate Raw Strings with source URLs embedded (merge first pass + re-search)
  const marketSize = [
    ...(marketRes?.answer ? [`[TAVILY ANSWER] ${marketRes.answer}`] : []),
    ...(marketRes?.results?.map(fmt) || []),
    ...(marketRes2?.answer ? [`[TAVILY ANSWER] ${marketRes2.answer}`] : []),
    ...(marketRes2?.results?.map(fmt) || []),
  ].filter(Boolean) as string[];
  const competitors = [
    ...extractedCompetitorsContext,
    ...(compRes?.results?.map(fmt) || []),
    ...(compRes2?.results?.map(fmt) || []),
  ].filter(Boolean);
  const painPoints = [
    ...(painRes?.results?.map(fmt) || []),
    ...(painRes2?.results?.map(fmt) || []),
  ].filter(Boolean);
  const trends = [
    ...(trendRes?.answer ? [`[TAVILY ANSWER] ${trendRes.answer}`] : []),
    ...(trendRes?.results?.map(fmt) || []),
  ].filter(Boolean) as string[];
  const regulations = [
    ...(regRes?.answer ? [`[TAVILY ANSWER] ${regRes.answer}`] : []),
    ...(regRes?.results?.map(fmt) || []),
  ].filter(Boolean) as string[];
  const unitEconomics = [
    ...(econRes?.answer ? [`[TAVILY ANSWER] ${econRes.answer}`] : []),
    ...(econRes?.results?.map(fmt) || []),
  ].filter(Boolean) as string[];

  // Merge and Deduplicate Source URLs (including re-search results)
  const rawSources = [
    ...(marketRes?.results || []),
    ...(compRes?.results || []),
    ...(painRes?.results || []),
    ...(trendRes?.results || []),
    ...(regRes?.results || []),
    ...(econRes?.results || []),
    ...(marketRes2?.results || []),
    ...(compRes2?.results || []),
    ...(painRes2?.results || []),
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

  const researchQuality = {
    marketDataFound: marketSize.length > 0,
    competitorDataFound: competitors.length > 0,
    painPointDataFound: painPoints.length > 0,
    trendDataFound: trends.length > 0,
    regulationDataFound: regulations.length > 0,
    unitEconomicsDataFound: unitEconomics.length > 0,
    totalSources: finalizedSources.length,
    summary: [
      `Market: ${marketSize.length} sources`,
      `Competitors: ${competitors.length} sources`,
      `Pain Points: ${painPoints.length} sources`,
      `Trends: ${trends.length} sources`,
      `Regulations: ${regulations.length} sources`,
      `Unit Economics: ${unitEconomics.length} sources`,
      `Total unique sources: ${finalizedSources.length}`,
      finalizedSources.length < 5 ? '⚠️ LOW DATA QUALITY — results may be unreliable for this geography/niche' : '',
    ].filter(Boolean).join(' | '),
  };

  console.log(`[Orchestrator] Research quality: ${researchQuality.summary}`);
  
  return {
    marketSize,
    competitors,
    painPoints,
    trends,
    regulations,
    unitEconomics,
    sources: finalizedSources,
    researchQuality,
  };
}
