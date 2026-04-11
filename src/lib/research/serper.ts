const SERPER_API_KEY = process.env.SERPER_API_KEY || 'dummy_serper';

// Helper for calling Serper API
async function callSerper(endpoint: 'search' | 'trends', body: any) {
  if (SERPER_API_KEY === 'dummy_serper') return null;
  try {
    const response = await fetch(`https://google.serper.dev/${endpoint}`, {
      method: 'POST',
      headers: {
        'X-API-KEY': SERPER_API_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    });
    
    if (!response.ok) {
      console.error(`[Serper] Request failed with status: ${response.status}`);
      return null;
    }
    
    return await response.json();
  } catch (error) {
    console.error(`[Serper] Network error calling Serper:`, error);
    return null;
  }
}

export async function googleSearch(query: string, num: number = 5) {
  const result = await callSerper('search', { q: query, num });
  
  if (!result || !result.organic) return [];
  
  // Format to standard output
  return result.organic.map((item: any) => ({
    title: item.title,
    url: item.link,
    snippet: item.snippet
  }));
}

export async function googleTrends(keywords: string) {
  // Serper has a news/search endpoint that can proxy trends context
  // Alternatively, we search google news for volume of keywords
  const result = await callSerper('search', { q: `${keywords} trend stats 2024`, tbs: "qdr:y", num: 3 });
  
  if (!result || !result.organic) return [];
  
  return result.organic.map((item: any) => ({
    title: item.title,
    snippet: item.snippet,
    source: item.link
  }));
}
