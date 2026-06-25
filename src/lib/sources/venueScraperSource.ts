import { db } from "@/lib/db";
import type { EventSearchQuery, EventSource, NormalizedEvent } from "./types";

const FETCH_TIMEOUT_MS = 10000;

interface LdJsonEvent {
  "@type"?: string | string[];
  "@id"?: string;
  name?: string;
  startDate?: string;
  endDate?: string;
  description?: string;
  url?: string;
  location?: { name?: string; address?: { addressLocality?: string } } | string;
  image?: string | string[] | { url?: string } | Array<{ url?: string }>;
}

function isEventItem(item: unknown): item is LdJsonEvent {
  if (!item || typeof item !== "object") return false;
  const type = (item as Record<string, unknown>)["@type"];
  return type === "Event" || (Array.isArray(type) && type.includes("Event"));
}

function extractLdJsonEvents(html: string): LdJsonEvent[] {
  const events: LdJsonEvent[] = [];
  const scriptRegex = /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let match;
  while ((match = scriptRegex.exec(html)) !== null) {
    try {
      const parsed: unknown = JSON.parse(match[1]);
      const items = Array.isArray(parsed) ? parsed : [parsed];
      for (const item of items) {
        if (isEventItem(item)) events.push(item);
        const graph = (item as Record<string, unknown>)?.["@graph"];
        if (Array.isArray(graph)) {
          for (const g of graph) {
            if (isEventItem(g)) events.push(g);
          }
        }
      }
    } catch {
      // skip invalid JSON blocks
    }
  }
  return events;
}

function getImageUrl(image: LdJsonEvent["image"]): string | undefined {
  if (!image) return undefined;
  if (typeof image === "string") return image;
  const first = Array.isArray(image) ? image[0] : image;
  return typeof first === "string" ? first : (first as { url?: string }).url;
}

function getLocationName(location: LdJsonEvent["location"]): string | undefined {
  if (!location) return undefined;
  return typeof location === "string" ? location : location.name;
}

function getCity(location: LdJsonEvent["location"]): string | undefined {
  if (!location || typeof location === "string") return undefined;
  return location.address?.addressLocality;
}

// Exported so the server action can call it when the user adds a URL.
export function extractPageTitle(html: string, pageUrl: string): string {
  const ogTitle =
    html.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i)?.[1] ??
    html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:title["']/i)?.[1];
  if (ogTitle) return ogTitle.trim();
  const title = html.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1];
  if (title) return title.trim();
  try {
    return new URL(pageUrl).hostname.replace(/^www\./, "");
  } catch {
    return pageUrl;
  }
}

export async function validateVenueUrl(url: string): Promise<{ label: string; readable: boolean }> {
  const res = await fetch(url, { signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) });
  if (!res.ok) throw new Error(`Could not load the page (HTTP ${res.status})`);
  const html = await res.text();
  const label = extractPageTitle(html, url);
  const readable = extractLdJsonEvents(html).some((e) => e.name && e.startDate);
  return { label, readable };
}

async function scrapeVenueEvents(source: {
  id: string;
  url: string;
  label: string;
}): Promise<NormalizedEvent[]> {
  const res = await fetch(source.url, { signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const html = await res.text();

  return extractLdJsonEvents(html)
    .filter((e) => e.name && e.startDate)
    .flatMap((e) => {
      const startTime = new Date(e.startDate!);
      if (isNaN(startTime.getTime())) return [];
      const endTime = e.endDate ? new Date(e.endDate) : undefined;
      return [
        {
          sourceEventId: `${source.id}:${e["@id"] ?? `${e.startDate}-${e.name}`}`,
          title: e.name!,
          description: e.description,
          url: e.url ?? source.url,
          startTime,
          endTime: endTime && !isNaN(endTime.getTime()) ? endTime : undefined,
          venueName: getLocationName(e.location),
          city: getCity(e.location),
          category: "LOCAL_VENUE" as const,
          imageUrl: getImageUrl(e.image),
        } satisfies NormalizedEvent,
      ];
    });
}

export const venueScraperSource: EventSource = {
  name: "venue-scraper",

  async search(query: EventSearchQuery): Promise<NormalizedEvent[]> {
    const sources = await db.venueSource.findMany({ where: { readable: true } });
    if (sources.length === 0) return [];

    const results = await Promise.allSettled(sources.map((s) => scrapeVenueEvents(s)));

    const events = results.flatMap((result, i) => {
      if (result.status === "rejected") {
        console.error(`Venue scraper "${sources[i].label}" failed:`, result.reason);
        return [];
      }
      return result.value;
    });

    return events.filter((event) => {
      if (query.startDate && event.startTime < query.startDate) return false;
      if (query.endDate && event.startTime > query.endDate) return false;
      return true;
    });
  },
};
