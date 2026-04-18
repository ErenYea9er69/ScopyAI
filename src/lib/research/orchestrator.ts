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
  rejectedSources: { url: string; title: string; reason: string }[];
  researchQuality: {
    marketDataFound: boolean;
    competitorDataFound: boolean;
    painPointDataFound: boolean;
    trendDataFound: boolean;
    regulationDataFound: boolean;
    unitEconomicsDataFound: boolean;
    totalSources: number;
    staleSourceCount: number;
    irrelevantSourceCount: number;
    oldestSourceYear: number | null;
    freshSourcePercentage: number;
    summary: string;
  };
};

// ========== SOURCE QUALITY SCORING v2 ==========

/** Domains that are never valid for market intelligence */
const REJECT_DOMAIN_PATTERNS = [
  /\.rss$/i, /feeds\./i, /feed\./i, /\.xml$/i,    // RSS feeds
  /cocktail/i, /recipe/i, /cooking/i,              // Food/drink sites
  /analytics\.usa\.gov/i,                            // Government analytics dashboards
  /wedding/i, /dating/i,                             // Irrelevant verticals
];

/** High-authority domains for market research */
const HIGH_AUTHORITY_DOMAINS = [
  'statista.com', 'gartner.com', 'mckinsey.com', 'grandviewresearch.com',
  'ibisworld.com', 'forrester.com', 'bain.com', 'bcg.com', 'deloitte.com',
  'pwc.com', 'ey.com', 'accenture.com', 'mordorintelligence.com',
  'marketsandmarkets.com', 'euromonitor.com', 'frost.com',
];

/** Government/academic domains */
const INSTITUTIONAL_DOMAINS = ['.gov', '.edu', '.ac.uk', '.nhs.uk'];

/**
 * Attempts to extract a year from a URL or title string.
 * Returns the year as a number, or null if not found.
 */
function extractYear(text: string): number | null {
  // Match 4-digit years between 2010 and current year + 1
  const currentYear = new Date().getFullYear();
  const yearRegex = /\b(20[1-9]\d)\b/g;
  const matches = text.match(yearRegex);
  if (!matches) return null;
  
  // Return the most recent year found
  const years = matches.map(Number).filter(y => y >= 2010 && y <= currentYear + 1);
  return years.length > 0 ? Math.max(...years) : null;
}

/**
 * Scores a source's quality on multiple dimensions.
 * Returns a confidence level and whether to reject the source entirely.
 */
function scoreSource(
  url: string,
  title: string,
  nicheKeywords: string[],
  score?: number
): { confidence: 'high' | 'medium' | 'low'; reject: boolean; rejectReason?: string; year: number | null } {
  const cleanUrl = url.toLowerCase();
  const cleanTitle = (title || '').toLowerCase();
  const combined = `${cleanUrl} ${cleanTitle}`;
  
  // 1. REJECT CHECK — is this domain completely irrelevant?
  for (const pattern of REJECT_DOMAIN_PATTERNS) {
    if (pattern.test(cleanUrl)) {
      return { confidence: 'low', reject: true, rejectReason: `Irrelevant domain pattern: ${pattern.source}`, year: null };
    }
  }
  
  // Check if URL is an RSS/XML feed
  if (cleanUrl.includes('/feed') && cleanUrl.includes('acast.com')) {
    return { confidence: 'low', reject: true, rejectReason: 'Podcast RSS feed — not a market research source', year: null };
  }

  // 2. RELEVANCE CHECK — does the source mention any niche keywords?
  const hasRelevance = nicheKeywords.some(kw => combined.includes(kw.toLowerCase()));
  if (!hasRelevance && nicheKeywords.length > 0) {
    // Give benefit of the doubt if search score is high
    if (!score || score < 0.6) {
      return { confidence: 'low', reject: true, rejectReason: `No niche keyword match in title/URL. Keywords checked: ${nicheKeywords.slice(0, 3).join(', ')}`, year: extractYear(combined) };
    }
  }

  // 3. FRESHNESS CHECK
  const year = extractYear(combined);
  const currentYear = new Date().getFullYear();
  const isStale = year !== null && (currentYear - year) > 2;

  // 4. AUTHORITY TIER
  const isHighAuthority = HIGH_AUTHORITY_DOMAINS.some(d => cleanUrl.includes(d));
  const isInstitutional = INSTITUTIONAL_DOMAINS.some(d => cleanUrl.includes(d));
  const isRedditQuora = cleanUrl.includes('reddit.com') || cleanUrl.includes('quora.com');
  
  if (isHighAuthority || isInstitutional) {
    return { confidence: isStale ? 'medium' : 'high', reject: false, year };
  }
  
  if (isRedditQuora) {
    // Reddit/Quora are valid for pain points but low authority for market sizing
    return { confidence: 'medium', reject: false, year };
  }
  
  if (score && score > 0.8) {
    return { confidence: isStale ? 'low' : 'medium', reject: false, year };
  }
  
  return { confidence: isStale ? 'low' : 'low', reject: false, year };
}

/**
 * Extracts likely competitor names from competitor research data strings.
 * Looks for company names mentioned in [SOURCE:] tags and content.
 */
function extractCompetitorNames(competitorData: string[]): string[] {
  const names = new Set<string>();
  
  for (const item of competitorData) {
    // Extract from [SOURCE: url | Title] patterns
    const sourceMatch = item.match(/\[SOURCE:\s*[^\|]+\|\s*([^\]]+)\]/);
    if (sourceMatch) {
      // The title often contains the competitor name
      const title = sourceMatch[1].trim();
      // Extract first meaningful word/phrase (skip generic words)
      const skipWords = ['the', 'a', 'an', 'vs', 'versus', 'top', 'best', 'review', 'reviews', 'pricing', 'alternative', 'alternatives'];
      const words = title.split(/[\s\-\|:,]+/).filter(w => w.length > 2 && !skipWords.includes(w.toLowerCase()));
      if (words.length > 0) {
        // Take first 1-2 capitalized words as potential company name
        const potentialName = words.slice(0, 2).filter(w => /^[A-Z]/.test(w)).join(' ');
        if (potentialName.length > 2) names.add(potentialName);
      }
    }
  }
  
  return Array.from(names).slice(0, 5); // Cap at 5 to limit API calls
}

/**
 * Orchestrates all parallel research gathering tasks
 */
export async function gatherIntelligence(intake: IntakeData): Promise<ResearchData> {
  // Start parallel requests
  console.log(`[Orchestrator] Firing parallel intel queries for ${intake.niche}...`);

  // Extract niche keywords for relevance checking
  const nicheKeywords = intake.niche
    .toLowerCase()
    .split(/[\s,;]+/)
    .filter(w => w.length > 3)
    .slice(0, 8);

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

  const [marketRes, compRes, painRes, trendRes, regRes, econRes, declineRes, googleFallback] = await Promise.all([
    tavily.searchMarket(intake.niche, intake.geography),
    tavily.searchCompetitors(intake.niche, intake.geography),
    tavily.searchPainPoints(intake.niche, complaintDomains, intake.geography),
    tavily.searchTrends(intake.niche),
    tavily.searchRegulations(intake.niche, intake.geography),
    tavily.searchUnitEconomics(intake.niche, intake.geography),
    tavily.searchMarketDecline(intake.niche, intake.geography),  // NEW: Decline signal search
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

  // Helper: format a Tavily result with URL attribution and freshness tag
  const fmt = (r: any): string => {
    const url = r?.url || 'unknown';
    const title = r?.title || '';
    const content = r?.content || r?.rawContent || '';
    const year = extractYear(`${url} ${title}`);
    const ageTag = year ? ` [AGE: ${year}]` : '';
    return `[SOURCE: ${url} | ${title}]${ageTag} ${content}`;
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
    // Merge market decline signals with a special prefix
    ...(declineRes?.results?.map((r: any) => {
      const base = fmt(r);
      return `[⚠️ DECLINE SIGNAL] ${base}`;
    }) || []),
  ].filter(Boolean) as string[];
  const regulations = [
    ...(regRes?.answer ? [`[TAVILY ANSWER] ${regRes.answer}`] : []),
    ...(regRes?.results?.map(fmt) || []),
  ].filter(Boolean) as string[];
  const unitEconomics = [
    ...(econRes?.answer ? [`[TAVILY ANSWER] ${econRes.answer}`] : []),
    ...(econRes?.results?.map(fmt) || []),
  ].filter(Boolean) as string[];

  // === DEAD COMPETITOR DETECTION ===
  // Extract competitor names from research data and check if any are defunct
  const extractedNames = extractCompetitorNames(competitors);
  if (extractedNames.length > 0) {
    console.log(`[Orchestrator] Checking ${extractedNames.length} competitor names for shutdown signals: ${extractedNames.join(', ')}`);
    
    const statusResults = await Promise.all(
      extractedNames.map(async (name) => {
        try {
          const status = await tavily.searchCompetitorStatus(name);
          const hasShutdownSignal = status.results?.some((r: any) => {
            const content = `${r.title || ''} ${r.content || ''}`.toLowerCase();
            return content.includes('shut down') || content.includes('shutdown') || 
                   content.includes('closed') || content.includes('ceased operations') ||
                   content.includes('defunct') || content.includes('bankruptcy');
          });
          return { name, isDefunct: hasShutdownSignal, results: status.results };
        } catch {
          return { name, isDefunct: false, results: [] };
        }
      })
    );
    
    // Tag defunct competitors in the competitor data
    for (const { name, isDefunct } of statusResults) {
      if (isDefunct) {
        console.warn(`[Orchestrator] ⚠️ DEFUNCT COMPETITOR DETECTED: ${name}`);
        // Prefix all competitor entries mentioning this name
        for (let i = 0; i < competitors.length; i++) {
          if (competitors[i].toLowerCase().includes(name.toLowerCase())) {
            competitors[i] = `[⚠️ DEFUNCT — this competitor appears to have shut down or ceased operations] ${competitors[i]}`;
          }
        }
      }
    }
  }

  // ========== SOURCE QUALITY SCORING v2 ==========
  // Merge and quality-score all source URLs
  
  const rawSources = [
    ...(marketRes?.results || []),
    ...(compRes?.results || []),
    ...(painRes?.results || []),
    ...(trendRes?.results || []),
    ...(regRes?.results || []),
    ...(econRes?.results || []),
    ...(declineRes?.results || []),
    ...(marketRes2?.results || []),
    ...(compRes2?.results || []),
    ...(painRes2?.results || []),
    ...(googleFallback || []).map((g: any) => ({ url: g.link, title: g.title, score: 0.5 }))
  ];

  const uniqueUrls = new Set<string>();
  const finalizedSources: { url: string; title: string; confidence: 'high'|'medium'|'low' }[] = [];
  const rejectedSources: { url: string; title: string; reason: string }[] = [];
  let staleSourceCount = 0;
  let irrelevantSourceCount = 0;
  let oldestYear: number | null = null;
  let freshCount = 0;

  const currentYear = new Date().getFullYear();

  for (const src of rawSources) {
    if (!src || !src.url) continue;
    
    // Normalize URL to deduplicate (strip trailing slashes, tracking params)
    const cleanUrl = src.url.split('?')[0].replace(/\/$/, "");
    
    if (!uniqueUrls.has(cleanUrl)) {
      uniqueUrls.add(cleanUrl);
      
      const quality = scoreSource(cleanUrl, src.title || '', nicheKeywords, src.score);
      
      if (quality.reject) {
        rejectedSources.push({
          url: cleanUrl,
          title: src.title || cleanUrl,
          reason: quality.rejectReason || 'Failed quality check',
        });
        irrelevantSourceCount++;
        continue; // Skip this source entirely
      }
      
      // Track freshness stats
      if (quality.year) {
        if (oldestYear === null || quality.year < oldestYear) {
          oldestYear = quality.year;
        }
        if (currentYear - quality.year <= 2) {
          freshCount++;
        } else {
          staleSourceCount++;
        }
      } else {
        // Unknown age — count as fresh by default
        freshCount++;
      }

      finalizedSources.push({
        url: cleanUrl,
        title: src.title || cleanUrl,
        confidence: quality.confidence,
      });
    }
  }

  const totalAccepted = finalizedSources.length;
  const freshPercentage = totalAccepted > 0 ? Math.round((freshCount / totalAccepted) * 100) : 0;

  console.log(`[Orchestrator] Source quality v2: ${totalAccepted} accepted, ${rejectedSources.length} rejected, ${staleSourceCount} stale.`);

  const researchQuality = {
    marketDataFound: marketSize.length > 0,
    competitorDataFound: competitors.length > 0,
    painPointDataFound: painPoints.length > 0,
    trendDataFound: trends.length > 0,
    regulationDataFound: regulations.length > 0,
    unitEconomicsDataFound: unitEconomics.length > 0,
    totalSources: totalAccepted,
    staleSourceCount,
    irrelevantSourceCount,
    oldestSourceYear: oldestYear,
    freshSourcePercentage: freshPercentage,
    summary: [
      `Market: ${marketSize.length} sources`,
      `Competitors: ${competitors.length} sources`,
      `Pain Points: ${painPoints.length} sources`,
      `Trends: ${trends.length} sources`,
      `Regulations: ${regulations.length} sources`,
      `Unit Economics: ${unitEconomics.length} sources`,
      `Total accepted: ${totalAccepted} | Rejected: ${rejectedSources.length} (quality filter)`,
      staleSourceCount > 0 ? `⚠️ ${staleSourceCount} source(s) are >2 years old` : '',
      freshPercentage < 50 ? `⚠️ LOW FRESHNESS — only ${freshPercentage}% of sources are recent` : '',
      totalAccepted < 5 ? '⚠️ LOW DATA QUALITY — results may be unreliable for this geography/niche' : '',
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
    rejectedSources,
    researchQuality,
  };
}
