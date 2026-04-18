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

// ========== SOURCE QUALITY SCORING v3 ==========

/** Domains that are never valid for market intelligence */
const REJECT_DOMAIN_PATTERNS = [
  /\.rss$/i, /feeds\./i, /feed\./i, /\.xml$/i,    // RSS feeds
  /cocktail/i, /recipe/i, /cooking/i,              // Food/drink sites
  /analytics\.usa\.gov/i,                            // Government analytics dashboards
  /wedding/i, /dating/i,                             // Irrelevant verticals
  /snap\.berkeley\.edu/i,                             // Snap! visual programming (not research)
  /scratch\.mit\.edu/i,                               // MIT Scratch (not research)
  /huggingface\.co\/[^\/]+\/vocab/i,                 // HuggingFace vocabulary files
  /\.txt$/i,                                         // Raw text files
];

/** High-authority domains for market research */
const HIGH_AUTHORITY_DOMAINS = [
  'statista.com', 'gartner.com', 'mckinsey.com', 'grandviewresearch.com',
  'ibisworld.com', 'forrester.com', 'bain.com', 'bcg.com', 'deloitte.com',
  'pwc.com', 'ey.com', 'accenture.com', 'mordorintelligence.com',
  'marketsandmarkets.com', 'euromonitor.com', 'frost.com',
];

/** Government/academic domains — with exclusions for educational platforms that aren't research */
const INSTITUTIONAL_DOMAINS = ['.gov', '.edu', '.ac.uk', '.nhs.uk'];

/** .edu subdomains that are educational platforms, NOT research sources */
const EDU_PLATFORM_EXCLUSIONS = [
  'snap.berkeley.edu', 'scratch.mit.edu', 'cs50.harvard.edu',
  'canvas.', 'blackboard.', 'moodle.',
];

/** Geography keywords to detect wrong-country sources */
const GEOGRAPHY_KEYWORDS: Record<string, string[]> = {
  'uk': ['united kingdom', 'britain', 'england', 'scotland', 'wales', 'uk market'],
  'us': ['united states', 'america', 'us market', 'usa'],
  'global': [], // No filtering for global
};

/** Countries that should trigger rejection when they appear in the TITLE for a different target geography */
const WRONG_GEOGRAPHY_SIGNALS = [
  'south korea', 'japan', 'china', 'brazil', 'india', 'spain',
  'france', 'germany', 'italy', 'australia', 'canada', 'mexico',
  'russia', 'saudi arabia', 'uae', 'nigeria', 'kenya', 'egypt',
];

/**
 * Attempts to extract a year from a URL or title string.
 * For Reddit URLs, extracts the post creation date from the base36 post ID.
 * Returns the year as a number, or null if not found.
 */
function extractYear(text: string): number | null {
  // Special handling for Reddit URLs — extract date from post ID
  const redditMatch = text.match(/reddit\.com\/r\/[^\/]+\/comments\/([a-z0-9]+)\//i);
  if (redditMatch) {
    try {
      // Reddit post IDs are base36 encoded timestamps (roughly)
      const postId = redditMatch[1];
      const timestamp = parseInt(postId, 36);
      // Reddit post IDs started around 2005, timestamps are in seconds
      // A rough heuristic: if the parsed number looks like a reasonable Unix timestamp
      if (timestamp > 1000000 && timestamp < 2000000000) {
        const date = new Date(timestamp * 1000);
        const year = date.getFullYear();
        if (year >= 2005 && year <= new Date().getFullYear()) {
          return year;
        }
      }
    } catch { /* Fall through to standard extraction */ }
  }

  // Standard year extraction from text
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
 * 
 * v3: Added .edu platform exclusion, geography relevance check.
 */
function scoreSource(
  url: string,
  title: string,
  nicheKeywords: string[],
  score?: number,
  targetGeography?: string
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
  
  // Check if URL is an RSS/XML feed or podcast platform
  if (cleanUrl.includes('acast.com') || cleanUrl.includes('anchor.fm') || cleanUrl.includes('podbean.com') ||
      (cleanUrl.includes('/feed') && (cleanUrl.includes('.xml') || cleanUrl.includes('rss')))) {
    return { confidence: 'low', reject: true, rejectReason: 'Podcast/RSS feed — not a market research source', year: null };
  }

  // 2. GEOGRAPHY RELEVANCE CHECK — reject sources about wrong countries
  if (targetGeography && targetGeography.toLowerCase() !== 'global') {
    const targetGeoLower = targetGeography.toLowerCase();
    for (const wrongGeo of WRONG_GEOGRAPHY_SIGNALS) {
      // Only reject if the TITLE specifically references a different country's market/report
      if (cleanTitle.includes(wrongGeo) && 
          (cleanTitle.includes('market') || cleanTitle.includes('report') || cleanTitle.includes('forecast')) &&
          !cleanTitle.includes(targetGeoLower)) {
        return { confidence: 'low', reject: true, rejectReason: `Source is about ${wrongGeo} market, but target geography is ${targetGeography}`, year: null };
      }
    }
  }

  // 3. RELEVANCE CHECK — does the source mention any niche keywords?
  const hasRelevance = nicheKeywords.some(kw => combined.includes(kw.toLowerCase()));
  if (!hasRelevance && nicheKeywords.length > 0) {
    // Give benefit of the doubt if search score is high
    if (!score || score < 0.6) {
      return { confidence: 'low', reject: true, rejectReason: `No niche keyword match in title/URL. Keywords checked: ${nicheKeywords.slice(0, 3).join(', ')}`, year: extractYear(combined) };
    }
  }

  // 4. FRESHNESS CHECK
  const year = extractYear(combined);
  const currentYear = new Date().getFullYear();
  const isStale = year !== null && (currentYear - year) > 2;

  // 5. AUTHORITY TIER
  const isHighAuthority = HIGH_AUTHORITY_DOMAINS.some(d => cleanUrl.includes(d));
  const isInstitutional = INSTITUTIONAL_DOMAINS.some(d => cleanUrl.includes(d));
  const isRedditQuora = cleanUrl.includes('reddit.com') || cleanUrl.includes('quora.com');
  
  // v3: Check if .edu domain is actually an educational platform, not research
  if (isInstitutional && cleanUrl.includes('.edu')) {
    const isEduPlatform = EDU_PLATFORM_EXCLUSIONS.some(excl => cleanUrl.includes(excl));
    if (isEduPlatform) {
      return { confidence: 'low', reject: true, rejectReason: `Educational platform (${cleanUrl.split('/')[2]}), not academic research`, year: null };
    }
  }
  
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
 * v3: Uses multiple extraction strategies:
 *   1. Brand names from URLs (e.g., supersapiens.com → "Supersapiens")
 *   2. Source title parsing (e.g., "Levels vs MyFitnessPal" → ["Levels", "MyFitnessPal"])
 *   3. Content keyword scanning for capitalized brand names
 *   4. User-provided competitor URL domains
 */
function extractCompetitorNames(competitorData: string[], userCompetitorUrls: string[] = []): string[] {
  const names = new Set<string>();
  
  // Strategy 1: Extract brand names from user-provided competitor URLs
  for (const url of userCompetitorUrls) {
    try {
      const domain = new URL(url.startsWith('http') ? url : `https://${url}`).hostname;
      // Extract brand from domain (e.g., supersapiens.com → Supersapiens)
      const brand = domain.replace(/^www\./, '').split('.')[0];
      if (brand.length > 2) {
        names.add(brand.charAt(0).toUpperCase() + brand.slice(1));
      }
    } catch { /* skip invalid URLs */ }
  }
  
  // Strategy 2: Extract brand names from source URLs in competitor data
  for (const item of competitorData) {
    // Extract URL from [SOURCE: url | Title] pattern
    const urlMatch = item.match(/\[SOURCE:\s*([^\s\|]+)/);
    if (urlMatch && urlMatch[1]) {
      try {
        const domain = new URL(urlMatch[1].startsWith('http') ? urlMatch[1] : `https://${urlMatch[1]}`).hostname;
        const brand = domain.replace(/^www\./, '').split('.')[0];
        // Skip generic domains
        const skipDomains = ['reddit', 'quora', 'google', 'youtube', 'twitter', 'facebook', 'linkedin', 'medium', 'wikipedia', 'amazon', 'producthunt'];
        if (brand.length > 2 && !skipDomains.includes(brand.toLowerCase())) {
          names.add(brand.charAt(0).toUpperCase() + brand.slice(1));
        }
      } catch { /* skip */ }
    }
    
    // Strategy 3: Extract from [SOURCE: url | Title] title portion
    const sourceMatch = item.match(/\[SOURCE:\s*[^\|]+\|\s*([^\]]+)\]/);
    if (sourceMatch) {
      const title = sourceMatch[1].trim();
      const skipWords = ['the', 'a', 'an', 'vs', 'versus', 'top', 'best', 'review', 'reviews', 'pricing', 
                         'alternative', 'alternatives', 'how', 'what', 'why', 'guide', 'blog', 'news',
                         'market', 'report', 'analysis', 'comparison', 'and', 'for', 'with', 'your'];
      const words = title.split(/[\s\-\|:,\/]+/).filter(w => w.length > 2 && !skipWords.includes(w.toLowerCase()));
      // Look for capitalized words (brand names)
      for (const word of words) {
        if (/^[A-Z][a-zA-Z]+$/.test(word) && word.length > 2 && word.length < 20) {
          names.add(word);
        }
      }
    }
    
    // Strategy 4: Look for known competitor name patterns in content
    // Match patterns like "Supersapiens" or "MyFitnessPal" (CamelCase brand names)
    const camelCaseMatch = item.match(/\b([A-Z][a-z]+(?:[A-Z][a-z]+)+)\b/g);
    if (camelCaseMatch) {
      for (const name of camelCaseMatch) {
        const skipCamel = ['CrossFit', 'JavaScript', 'TypeScript', 'LinkedIn', 'YouTube', 'Facebook', 'Instagram', 'TikTok', 'WhatsApp'];
        if (!skipCamel.includes(name) && name.length > 3) {
          names.add(name);
        }
      }
    }
  }
  
  // Filter out generic words that slipped through
  const genericNames = ['market', 'health', 'fitness', 'nutrition', 'coaching', 'sports', 'athlete', 'training', 'wellness'];
  const filtered = Array.from(names).filter(n => !genericNames.includes(n.toLowerCase()));
  
  return filtered.slice(0, 8); // Cap at 8 to limit API calls
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

  // v4: Added platform partner search to catch competitors with official platform endorsements
  const [marketRes, compRes, painRes, trendRes, regRes, econRes, declineRes, partnerRes, googleFallback] = await Promise.all([
    tavily.searchMarket(intake.niche, intake.geography),
    tavily.searchCompetitors(intake.niche, intake.geography),
    tavily.searchPainPoints(intake.niche, complaintDomains, intake.geography),
    tavily.searchTrends(intake.niche),
    tavily.searchRegulations(intake.niche, intake.geography),
    tavily.searchUnitEconomics(intake.niche, intake.geography),
    tavily.searchMarketDecline(intake.niche, intake.geography),
    tavily.searchPlatformPartners(intake.niche, intake.geography),  // v4: Find official platform partners
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
    // v4: Merge platform partner results into competitor data with special tag
    ...(partnerRes?.results?.map((r: any) => {
      const base = fmt(r);
      return `[🏷️ PLATFORM PARTNER — this company has an official partnership in this space] ${base}`;
    }) || []),
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

  // === DEAD COMPETITOR DETECTION v4 ===
  // v4: Precision system with counter-signal verification to prevent false positives.
  // Previous versions marked WHOOP ($10B) and Macrostax (200K users) as defunct
  // because search results mentioned OTHER defunct companies in the same articles.
  const extractedNames = extractCompetitorNames(competitors, intake.competitorUrls || []);
  if (extractedNames.length > 0) {
    console.log(`[Orchestrator] Checking ${extractedNames.length} competitor names for shutdown signals: ${extractedNames.join(', ')}`);
    
    const statusResults = await Promise.all(
      extractedNames.map(async (name) => {
        try {
          const status = await tavily.searchCompetitorStatus(name);
          const nameLower = name.toLowerCase();
          
          // v4: PRECISION CHECK — require the company name to appear NEAR shutdown keywords
          // in the same sentence, not just anywhere in the same article
          let shutdownScore = 0;
          let vitalityScore = 0;
          
          for (const r of (status.results || [])) {
            const title = (r.title || '').toLowerCase();
            const content = (r.content || '').toLowerCase();
            
            // Split into sentences for precision matching
            const sentences = `${title}. ${content}`.split(/[.!?]+/);
            
            for (const sentence of sentences) {
              const mentionsName = sentence.includes(nameLower);
              if (!mentionsName) continue; // Skip sentences that don't mention this company
              
              // Shutdown signals IN THE SAME SENTENCE as the company name
              const shutdownKeywords = ['shut down', 'shutdown', 'ceased operations', 'defunct', 'went bankrupt', 'closed permanently', 'terminated', 'discontinued'];
              const hasShutdown = shutdownKeywords.some(kw => sentence.includes(kw));
              if (hasShutdown) shutdownScore += 2;
              
              // COUNTER-SIGNALS — evidence the company is ALIVE
              const vitalityKeywords = ['raised', 'funding', 'valuation', 'active users', 'members', 'launched', 'partnership', 'pricing', 'plans start at', 'per month', 'per year', 'revenue', 'bookings', 'growth', 'series'];
              const hasVitality = vitalityKeywords.some(kw => sentence.includes(kw));
              if (hasVitality) vitalityScore += 1;
            }
          }
          
          // v4: Only mark as defunct if shutdown signals DOMINATE and no vitality signals exist
          const isDefunct = shutdownScore >= 3 && vitalityScore === 0;
          
          console.log(`[Orchestrator] ${name}: shutdownScore=${shutdownScore}, vitalityScore=${vitalityScore}, verdict=${isDefunct ? 'DEFUNCT' : 'ALIVE'}`);
          
          return { name, isDefunct, shutdownScore, vitalityScore, results: status.results };
        } catch {
          return { name, isDefunct: false, shutdownScore: 0, vitalityScore: 0, results: [] };
        }
      })
    );
    
    // Tag defunct competitors across ALL data arrays (not just competitors)
    for (const { name, isDefunct } of statusResults) {
      if (isDefunct) {
        console.warn(`[Orchestrator] ⚠️ CONFIRMED DEFUNCT: ${name} (passed precision + counter-signal checks)`);
        const defunctTag = `[⚠️ DEFUNCT — this competitor has confirmed shutdown/ceased operations] `;
        const nameLower = name.toLowerCase();
        
        // Tag in competitors array
        for (let i = 0; i < competitors.length; i++) {
          if (competitors[i].toLowerCase().includes(nameLower) && !competitors[i].startsWith('[⚠️ DEFUNCT')) {
            competitors[i] = `${defunctTag}${competitors[i]}`;
          }
        }
        
        // v4: Also tag in painPoints — prevent using defunct company marketing copy as buyer evidence
        for (let i = 0; i < painPoints.length; i++) {
          if (painPoints[i].toLowerCase().includes(nameLower) && !painPoints[i].startsWith('[⚠️ DEFUNCT')) {
            painPoints[i] = `[⚠️ SOURCE FROM DEFUNCT COMPANY — ${name} has shut down. Do NOT use their marketing copy as current buyer evidence] ${painPoints[i]}`;
          }
        }
        
        // v4: Also tag in marketSize
        for (let i = 0; i < marketSize.length; i++) {
          if (marketSize[i].toLowerCase().includes(nameLower) && !marketSize[i].startsWith('[⚠️ DEFUNCT')) {
            marketSize[i] = `[⚠️ DATA FROM DEFUNCT COMPANY — ${name} has shut down. Their market data may be outdated] ${marketSize[i]}`;
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
      
      const quality = scoreSource(cleanUrl, src.title || '', nicheKeywords, src.score, intake.geography);
      
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
