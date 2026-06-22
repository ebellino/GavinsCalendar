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
// Split into civic/institutional sources (more likely to publish a clean ICS
// feed) and venue/nightlife sources (less likely to, but the actual goal).
function buildQueries(city: string): string[] {
  return [
    `${city} community calendar ics`,
    `${city} events calendar feed`,
    `${city} eventbrite organizer`,
    `${city} library events calendar`,
    `${city} parks and recreation calendar`,
    `${city} live music venue calendar`,
    `${city} concert venue schedule`,
    `${city} bar live music eventbrite.com/o`,
  ];
}

const FETCH_TIMEOUT_MS = 8000;
const MAX_CANDIDATES_TO_VALIDATE = 25;

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

// Google Calendar "render" viewer links embed the real feed as a ?cid= param -
// either a direct ICS URL, or a bare calendar ID that needs the public export path.
function unwrapGoogleCalendarRenderUrl(candidateUrl: string): string | null {
  let parsed: URL;
  try {
    parsed = new URL(candidateUrl);
  } catch {
    return null;
  }
  if (parsed.hostname !== "calendar.google.com" || !parsed.pathname.includes("/calendar/render")) {
    return null;
  }
  const cid = parsed.searchParams.get("cid");
  if (!cid) return null;
  if (cid.startsWith("http")) return cid;
  return `https://calendar.google.com/calendar/ical/${encodeURIComponent(cid)}/public/basic.ics`;
}

async function resolveFeedUrl(candidateUrl: string): Promise<string | null> {
  // Must run before the .ics shortcut below: a render URL's *own* querystring
  // can end in ".ics" (because the wrapped inner URL does), which would
  // otherwise wrongly short-circuit to treating the wrapper page as the feed.
  const unwrapped = unwrapGoogleCalendarRenderUrl(candidateUrl);
  if (unwrapped) return unwrapped;

  if (candidateUrl.endsWith(".ics")) return candidateUrl;

  const res = await fetchWithTimeout(candidateUrl);
  const contentType = res.headers.get("content-type") ?? "";
  if (contentType.includes("text/calendar")) return candidateUrl;
  if (!contentType.includes("text/html")) return null;

  const html = await res.text();
  const linkedUrl = findFeedLinkInHtml(html, candidateUrl);
  if (!linkedUrl) return null;

  // The extracted link can itself be a Google Calendar render wrapper rather
  // than a raw .ics file - unwrap it the same way as the top-level candidate.
  return unwrapGoogleCalendarRenderUrl(linkedUrl) ?? linkedUrl;
}

async function validateFeed(
  feedUrl: string,
  city: string,
  label: string
): Promise<{ eventCount: number; cityMatch: boolean } | null> {
  const data = await ical.async.fromURL(feedUrl);
  let eventCount = 0;
  let locationMatch = false;
  const cityLower = city.toLowerCase();

  for (const key of Object.keys(data)) {
    const component = data[key];
    if (!component || component.type !== "VEVENT") continue;
    eventCount++;
    const location = typeof component.location === "string" ? component.location : "";
    if (location.toLowerCase().includes(cityLower)) locationMatch = true;
  }

  // Per-event LOCATION text often omits the city entirely even for a genuinely
  // local feed (e.g. a university's own calendar rarely repeats its own city in
  // every event) - the source's own label/URL mentioning the city is just as
  // good a signal, and avoids mislabeling good sources as "unconfirmed".
  const sourceMatch = label.toLowerCase().includes(cityLower) || feedUrl.toLowerCase().includes(cityLower);
  const cityMatch = locationMatch || sourceMatch;

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
  for (const [i, result] of searchResults.entries()) {
    if (result.status !== "fulfilled") {
      console.error(`Discovery query "${queries[i]}" failed:`, result.reason);
      continue;
    }
    for (const item of result.value) {
      if (seen.has(item.url)) continue;
      seen.add(item.url);
      candidates.push({ url: item.url, label: item.title || new URL(item.url).hostname });
    }
  }
  console.log(`Discovery for "${city}": ${candidates.length} unique candidate URL(s) from Tavily`);

  // Eventbrite organizer pages (/o/venue-name) export ICS; Eventbrite's own
  // city-browse pages (/d/state--city) never do - check the former first so
  // truncation below doesn't crowd them out with browse pages.
  const isOrganizerPage = (url: string) => url.includes("eventbrite.com/o/");
  const prioritized = [...candidates].sort(
    (a, b) => Number(isOrganizerPage(b.url)) - Number(isOrganizerPage(a.url))
  );

  const toCheck = prioritized.slice(0, MAX_CANDIDATES_TO_VALIDATE);

  const validated = await Promise.allSettled(
    toCheck.map(async (candidate) => {
      const feedUrl = await resolveFeedUrl(candidate.url);
      if (!feedUrl) {
        console.log(`  rejected (no feed link found): ${candidate.url}`);
        return null;
      }
      const result = await validateFeed(feedUrl, city, candidate.label);
      if (!result) {
        console.log(`  rejected (not a parseable/non-empty ICS feed): ${feedUrl}`);
        return null;
      }
      console.log(`  accepted: ${feedUrl} (${result.eventCount} events, cityMatch=${result.cityMatch})`);
      return {
        url: feedUrl,
        label: candidate.label,
        eventCount: result.eventCount,
        cityMatch: result.cityMatch,
      } satisfies DiscoveryCandidate;
    })
  );

  for (const [i, result] of validated.entries()) {
    if (result.status === "rejected") {
      console.error(`  error validating ${toCheck[i].url}:`, result.reason);
    }
  }

  return validated
    .flatMap((result) => (result.status === "fulfilled" && result.value ? [result.value] : []))
    .sort((a, b) => Number(b.cityMatch) - Number(a.cityMatch));
}
