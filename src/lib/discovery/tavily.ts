// Tavily Search API docs: https://docs.tavily.com/documentation/api-reference/endpoint/search
const SEARCH_URL = "https://api.tavily.com/search";

export type TavilyResult = {
  title: string;
  url: string;
  content: string;
};

export async function tavilySearch(query: string, maxResults = 5): Promise<TavilyResult[]> {
  const apiKey = process.env.TAVILY_API_KEY;
  if (!apiKey) return [];

  const res = await fetch(SEARCH_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query, max_results: maxResults }),
  });

  if (!res.ok) {
    throw new Error(`Tavily search failed: ${res.status} ${res.statusText}`);
  }

  const data: { results: TavilyResult[] } = await res.json();
  return data.results ?? [];
}
