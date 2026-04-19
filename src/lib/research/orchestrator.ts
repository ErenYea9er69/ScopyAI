import * as tavily from './tavily';
import * as serper from './serper';
import { generateStructuredOutput, MODELS } from '../ai/client';
import { 
  queryExpansionPrompt, 
  queryPlanSchema, 
  sourceRelevancePrompt, 
  relevanceSchema, 
  competitorDetectivePrompt, 
  competitorStatusSchema,
  gapAnalysisPrompt,
  gapAnalysisSchema
} from '../ai/prompts/research';

export type IntakeData = {
  niche: string;
  geography: string;
  stage: string;
  budget: string;
  timeCommitment: string;
  assets: string[];
  competitorUrls: string[];
  complaintPlatforms: string[];
  founderFit: string[];
  goalTimeline: string;
  uniqueInsight: string;
  acquisitionChannel: string;
  buyerType: string;
  revenueModel: string;
  whyNow: string;
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
 * v5: Uses LongCat to semantically evaluate if a source snippet is relevant
 * to the specific business niche and unique insight.
 */
async function evaluateSourceRelevance(
  snippet: string,
  niche: string,
  insight: string
): Promise<{ relevanceScore: number; reasoning: string; shouldKeep: boolean }> {
  const goal = `Researching the viability of ${niche}. Specific focus: ${insight}`;
  const p = sourceRelevancePrompt(snippet, goal);
  
  try {
    return await generateStructuredOutput(
      p.system,
      p.user,
      relevanceSchema,
      MODELS.ROUTER
    );
  } catch (err) {
    console.error('[Orchestrator] Relevance check failed, assuming relevant as fallback:', err);
    return { relevanceScore: 5, reasoning: 'Fallback due to error', shouldKeep: true };
  }
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
  // v5: Step 1 — Semantic Query Expansion via LongCat
  console.log(`[Orchestrator] Planning research trajectories for "${intake.niche}"...`);
  const planPrompt = queryExpansionPrompt(
    intake.niche,
    intake.geography,
    intake.uniqueInsight,
    intake.whyNow
  );
  
  let researchPlan;
  try {
    researchPlan = await generateStructuredOutput(
      planPrompt.system,
      planPrompt.user,
      queryPlanSchema,
      MODELS.ROUTER
    );
  } catch (err) {
    console.error('[Orchestrator] Query expansion failed, falling back to legacy queries:', err);
    // Fallback to basic queries if expansion fails
    researchPlan = {
      marketSizeQueries: [`${intake.niche} market size ${intake.geography}`],
      competitorQueries: [`${intake.niche} competitors alternatives ${intake.geography}`],
      painPointQueries: [`${intake.niche} problems complaints frustration`],
      trendQueries: [`${intake.niche} trends 2024 2025`],
      regulationQueries: [`${intake.niche} regulations legal ${intake.geography}`],
      unitEconomicsQueries: [`${intake.niche} CAC LTV unit economics`],
    };
  }

  // Extract niche keywords for relevance checking (legacy fallback)
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

  // v5: Step 2 — Parallel search using Expanded Queries
  console.log(`[Orchestrator] Batching ${Object.values(researchPlan).flat().length} search queries across 6 intel domains...`);
  const [marketResBatch, compResBatch, painResBatch, trendResBatch, regResBatch, econResBatch, declineRes, partnerRes, googleFallback] = await Promise.all([
    Promise.all(researchPlan.marketSizeQueries.map(q => typeof q === 'string' ? tavily.searchGeneric(q, { includeAnswer: true, searchDepth: 'advanced' }) : Promise.resolve({results: []}))),
    Promise.all(researchPlan.competitorQueries.map(q => typeof q === 'string' ? tavily.searchGeneric(q, { maxResults: 7 }) : Promise.resolve({results: []}))),
    Promise.all(researchPlan.painPointQueries.map(q => typeof q === 'string' ? tavily.searchGeneric(q, { includeDomains: complaintDomains, maxResults: 7, searchDepth: 'advanced' }) : Promise.resolve({results: []}))),
    Promise.all(researchPlan.trendQueries.map(q => typeof q === 'string' ? tavily.searchGeneric(q, { includeAnswer: true, maxResults: 5, timeRange: 'year' }) : Promise.resolve({results: []}))),
    Promise.all(researchPlan.regulationQueries.map(q => typeof q === 'string' ? tavily.searchGeneric(q, { includeAnswer: true, maxResults: 3 }) : Promise.resolve({results: []}))),
    Promise.all(researchPlan.unitEconomicsQueries.map(q => typeof q === 'string' ? tavily.searchGeneric(q, { includeAnswer: true, maxResults: 5, searchDepth: 'advanced' }) : Promise.resolve({results: []}))),
    tavily.searchMarketDecline(intake.niche, intake.geography),
    tavily.searchPlatformPartners(intake.niche, intake.geography),
    serper.googleSearch(`${intake.niche} software solutions ${intake.geography}`) // Fallback/Supplemental
  ]);

  // Helper to merge batch results
  const mergeResults = (batch: any[]) => ({
    results: batch.flatMap(r => r.results || []),
    answer: batch.find(r => r.answer)?.answer || '',
  });

  const marketRes = mergeResults(marketResBatch as any[]);
  const compRes = mergeResults(compResBatch);
  const painRes = mergeResults(painResBatch);
  const trendRes = mergeResults(trendResBatch);
  const regRes = mergeResults(regResBatch);
  const econRes = mergeResults(econResBatch);

  // Helper: format a Tavily result with URL attribution and freshness tag
  const fmt = (r: any): string => {
    const url = r?.url || 'unknown';
    const title = r?.title || '';
    const content = r?.content || r?.rawContent || '';
    const year = extractYear(`${url} ${title}`);
    const ageTag = year ? ` [AGE: ${year}]` : '';
    return `[SOURCE: ${url} | ${title}]${ageTag} ${content}`;
  };

  // v5: Step 2b — Adversarial Re-Search (Auto)
  // Analyzes initial snippets for "gaps" and fires a second wave if depth is low.
  let marketRes2: any = null;
  let compRes2: any = null;
  let painRes2: any = null;

  const combinedBatchContext = [
    ...marketRes.results.map(fmt),
    ...compRes.results.map(fmt),
    ...painRes.results.map(fmt)
  ].join('\n').slice(0, 8000);

  console.log(`[Orchestrator] Auditing research depth for gaps...`);
  const gapPrompt = gapAnalysisPrompt(intake.niche, combinedBatchContext);
  let gapResult;
  try {
    gapResult = await generateStructuredOutput(
      gapPrompt.system,
      gapPrompt.user,
      gapAnalysisSchema,
      MODELS.ROUTER
    );
  } catch (err) {
    console.error('[Orchestrator] Gap analysis failed:', err);
    gapResult = { depthScore: 8, newQueries: [] }; // Assume deep enough to avoid infinite loop
  }

  if (gapResult.depthScore < 7 && gapResult.newQueries.length > 0) {
    console.log(`[Orchestrator] Research depth is ${gapResult.depthScore}/10. Firing ${gapResult.newQueries.length} adversarial queries: ${gapResult.newQueries.join(', ')}`);
    
    const reSearchPromises = gapResult.newQueries.map((q: string) => tavily.searchGeneric(q, { searchDepth: 'advanced', maxResults: 5 }));
    const reSearchRes = await Promise.all(reSearchPromises);
    
    // Distribute re-searched data (basic heuristic distribution based on query keywords)
    const allReResults = reSearchRes.flatMap((r: any) => r.results || []);
    marketRes2 = { results: allReResults.filter((r: any) => (r.title + r.content).toLowerCase().match(/market|size|revenue|tam|trend/)) };
    compRes2 = { results: allReResults.filter((r: any) => (r.title + r.content).toLowerCase().match(/competitor|alternative|vs|pricing/)) };
    painRes2 = { results: allReResults.filter((r: any) => (r.title + r.content).toLowerCase().match(/problem|complaint|frustrated|reddit|quora/)) };
    
    console.log(`[Orchestrator] Adversarial re-search complete. Found ${allReResults.length} new signals.`);
  }

  const competitorExtractions = await Promise.all(
    (intake.competitorUrls || []).filter(u => u.trim()).map(url => tavily.extractPage(url, intake.niche))
  );

  const extractedCompetitorsContext = competitorExtractions
    .filter(Boolean)
    .flatMap((ex: any) => {
      // Tavily Extract SDK returns a results array, but each item might be the raw content directly or another nested object
      const rawResults = Array.isArray(ex?.results) ? ex.results : [];
      return rawResults.map((r: any) => {
        const url = r?.url || 'user-provided';
        const title = r?.title || '';
        const content = String(r?.rawContent || r?.content || r?.markdown || '').slice(0, 10000);
        return `[SOURCE: ${url} | ${title}] ${content}`;
      });
    });

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

  // v5: Step 3 — Competitor Detective (LLM)
  // Replaces the ~100 line regex "Precision System v4"
  console.log(`[Orchestrator] Running Competitor Detective on gathered context...`);
  
  const compContext = [
    ...extractedCompetitorsContext,
    ...(compRes?.results?.map(fmt) || [])
  ].join('\n\n').slice(0, 15000); // Token safety
  
  const detectivePrompt = competitorDetectivePrompt(compContext);
  let detectiveResult;
  try {
    detectiveResult = await generateStructuredOutput(
      detectivePrompt.system,
      detectivePrompt.user,
      competitorStatusSchema,
      MODELS.ROUTER
    );
  } catch (err) {
    console.error('[Orchestrator] Competitor detective failed, falling back to basic extraction:', err);
    detectiveResult = { competitors: [] };
  }

  // Tag defunct competitors across ALL data arrays
  for (const { name, status } of detectiveResult.competitors) {
    if (status === 'defunct') {
      const defunctTag = `[⚠️ DEFUNCT — this competitor has confirmed shutdown/ceased operations] `;
      const nameLower = name.toLowerCase();
      
      // Tag in competitors
      for (let i = 0; i < competitors.length; i++) {
        if (competitors[i].toLowerCase().includes(nameLower) && !competitors[i].startsWith('[⚠️ DEFUNCT')) {
          competitors[i] = `${defunctTag}${competitors[i]}`;
        }
      }
      // Tag in pain points
      for (let i = 0; i < painPoints.length; i++) {
        if (painPoints[i].toLowerCase().includes(nameLower) && !painPoints[i].startsWith('[⚠️ SOURCE')) {
          painPoints[i] = `[⚠️ SOURCE FROM DEFUNCT COMPANY — ${name} has shut down] ${painPoints[i]}`;
        }
      }
    }
  }

  // v5: Step 4 — Source Quality Scoring & LLM Relevance Filter
  const uniqueUrls = new Set<string>();
  const finalizedSources: { url: string; title: string; confidence: 'high'|'medium'|'low' }[] = [];
  const rejectedSources: { url: string; title: string; reason: string }[] = [];
  let staleSourceCount = 0;
  let irrelevantSourceCount = 0;
  let oldestYear: number | null = null;
  let freshCount = 0;

  const currentYear = new Date().getFullYear();
  const rawSourcesList = [
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

  // First pass: Heuristic filtering
  const candidateSources = [];
  for (const src of rawSourcesList) {
    if (!src || !src.url) continue;
    const cleanUrl = src.url.split('?')[0].replace(/\/$/, "");
    if (uniqueUrls.has(cleanUrl)) continue;
    uniqueUrls.add(cleanUrl);

    const quality = scoreSource(cleanUrl, src.title || '', nicheKeywords, src.score, intake.geography);
    if (quality.reject) {
      rejectedSources.push({ url: cleanUrl, title: src.title || cleanUrl, reason: quality.rejectReason || 'Heuristic filter' });
      irrelevantSourceCount++;
      continue;
    }
    candidateSources.push({ ...src, cleanUrl, quality });
  }

  // Second pass: LLM Relevance Filter on top 12 candidates
  console.log(`[Orchestrator] Auditing top ${Math.min(candidateSources.length, 12)} sources for semantic relevance...`);
  const validationPromises = candidateSources.slice(0, 12).map(async (src) => {
    const audit = await evaluateSourceRelevance(
      `${src.title} ${src.content || ''}`,
      intake.niche,
      intake.uniqueInsight
    );
    return { ...src, audit };
  });

  const auditedSources = await Promise.all(validationPromises);

  for (const src of auditedSources) {
    if (!src.audit.shouldKeep && src.audit.relevanceScore < 4) {
      rejectedSources.push({ url: src.cleanUrl, title: src.title || src.cleanUrl, reason: `LLM Audit: ${src.audit.reasoning}` });
      irrelevantSourceCount++;
      continue;
    }

    // Accept validated source
    if (src.quality.year) {
      if (oldestYear === null || src.quality.year < oldestYear) oldestYear = src.quality.year;
      if (currentYear - src.quality.year <= 2) freshCount++;
      else staleSourceCount++;
    } else {
      freshCount++;
    }

    finalizedSources.push({
      url: src.cleanUrl,
      title: src.title || src.cleanUrl,
      confidence: src.quality.confidence,
    });
  }

  // Add remaining candidates (beyond the top 12) without LLM audit to keep source count healthy
  for (const src of candidateSources.slice(12)) {
    finalizedSources.push({
      url: src.cleanUrl,
      title: src.title || src.cleanUrl,
      confidence: src.quality.confidence,
    });
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
