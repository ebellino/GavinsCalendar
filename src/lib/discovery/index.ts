import * as ical from "node-ical";
import { tavilySearch } from "./tavily";

export type DiscoveryCandidate = {
  url: string;
  label: string;
  eventCount: number;
  cityMatch: boolean;
};

// Bounded, fixed set of query templates - keeps each discovery run to a small,
// predictable number of API calls rather than open-ended crawling.
function buildQueries(city: string): string[] {
  return [
    `${city} community calendar ics`,
    `${city} events calendar feed`,
    `${city} eventbrite organizer`,
    `${city} library events calendar`,
    `${city} parks and recreation calendar`,
  ];
}

const FETCH_TIMEOUT_MS = 8000;
const MAX_CANDIDATES_TO_VALIDATE = 15;

async function fetchWithTimeout(url: string): Promise<Response> {
  return fetch(url, { signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) });
}

// A page that publishes a feed link explicitly (rather than scraping its content) -
// looks for <link type="text/calendar"> or any anchor ending in .ics.
function findFeedLinkInHtml(html: string, pageUrl: string): string | null {
  const patterns = [
    /<link[^>]+type=["']text\/calendar["'][^>]+href=["']([^"']+)["']/i,
    /href=["']([^"']+\.ics(?:\?[^"']*)?)["']/i,
  ];
  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match) {
      try {
        return new URL(match[1], pageUrl).toString();
      } catch {
        continue;
      }
    }
  }
  return null;
}

async function resolveFeedUrl(candidateUrl: string): Promise<string | null> {
  if (candidateUrl.endsWith(".ics")) return candidateUrl;

  const res = await fetchWithTimeout(candidateUrl);
  const contentType = res.headers.get("content-type") ?? "";
  if (contentType.includes("text/calendar")) return candidateUrl;
  if (!contentType.includes("text/html")) return null;

  const html = await res.text();
  return findFeedLinkInHtml(html, candidateUrl);
}

async function validateFeed(feedUrl: string, city: string): Promise<{ eventCount: number; cityMatch: boolean } | null> {
  const data = await ical.async.fromURL(feedUrl);
  let eventCount = 0;
  let cityMatch = false;
  const cityLower = city.toLowerCase();

  for (const key of Object.keys(data)) {
    const component = data[key];
    if (!component || component.type !== "VEVENT") continue;
    eventCount++;
    const location = typeof component.location === "string" ? component.location : "";
    if (location.toLowerCase().includes(cityLower)) cityMatch = true;
  }

  return eventCount > 0 ? { eventCount, cityMatch } : null;
}

// Runs a bounded discovery pass for a city: a handful of search queries, light
// validation that each candidate is a real parseable ICS feed, and a rough
// geo-relevance check - never persists anything, the caller decides what to keep.
export async function discoverLocalFeeds(city: string): Promise<DiscoveryCandidate[]> {
  const queries = buildQueries(city);
  const searchResults = await Promise.allSettled(queries.map((q) => tavilySearch(q, 5)));

  const seen = new Set<string>();
  const candidates: { url: string; label: string }[] = [];
  for (const result of searchResults) {
    if (result.status !== "fulfilled") continue;
    for (const item of result.value) {
      if (seen.has(item.url)) continue;
      seen.add(item.url);
      candidates.push({ url: item.url, label: item.title || new URL(item.url).hostname });
    }
  }

  const toCheck = candidates.slice(0, MAX_CANDIDATES_TO_VALIDATE);

  const validated = await Promise.allSettled(
    toCheck.map(async (candidate) => {
      const feedUrl = await resolveFeedUrl(candidate.url);
      if (!feedUrl) return null;
      const result = await validateFeed(feedUrl, city);
      if (!result) return null;
      return {
        url: feedUrl,
        label: candidate.label,
        eventCount: result.eventCount,
        cityMatch: result.cityMatch,
      } satisfies DiscoveryCandidate;
    })
  );

  return validated
    .flatMap((result) => (result.status === "fulfilled" && result.value ? [result.value] : []))
    .sort((a, b) => Number(b.cityMatch) - Number(a.cityMatch));
}
