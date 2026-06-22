import * as ical from "node-ical";
import { db } from "@/lib/db";
import { categorize } from "@/lib/categories";
import type { EventSearchQuery, EventSource, NormalizedEvent } from "./types";

// Pulls events from user-approved local calendar feeds (src/lib/discovery) instead
// of querying a search API. Only runs when a city is given, since these feeds are
// only meaningful once scoped to a specific place.
export const icsFeedSource: EventSource = {
  name: "ics-feed",

  async search(query: EventSearchQuery): Promise<NormalizedEvent[]> {
    if (!query.city) return [];

    const feeds = await db.localFeedSource.findMany({
      where: { city: { equals: query.city, mode: "insensitive" } },
    });
    if (feeds.length === 0) return [];

    const results = await Promise.allSettled(feeds.map((feed) => fetchFeedEvents(feed)));

    const events = results.flatMap((result, i) => {
      if (result.status === "rejected") {
        console.error(`ICS feed "${feeds[i].label}" (${feeds[i].url}) failed:`, result.reason);
        return [];
      }
      return result.value;
    });

    // The feed itself has no date-range query param - filter post-fetch instead.
    return events.filter((event) => {
      if (query.startDate && event.startTime < query.startDate) return false;
      if (query.endDate && event.startTime > query.endDate) return false;
      return true;
    });
  },
};

function paramValueToString(value: unknown): string | undefined {
  if (value == null) return undefined;
  if (typeof value === "object" && "val" in (value as Record<string, unknown>)) {
    return String((value as { val: unknown }).val);
  }
  return String(value);
}

async function fetchFeedEvents(feed: { id: string; url: string; city: string }): Promise<NormalizedEvent[]> {
  const data = await ical.async.fromURL(feed.url);

  const events: NormalizedEvent[] = [];
  for (const key of Object.keys(data)) {
    const component = data[key];
    if (!component || component.type !== "VEVENT" || !component.start) continue;

    events.push({
      // Namespaced by feed id so two feeds can't collide on a reused UID.
      sourceEventId: `${feed.id}:${component.uid ?? key}`,
      title: paramValueToString(component.summary) ?? "Untitled event",
      description: paramValueToString(component.description),
      url: component.url ?? feed.url,
      startTime: new Date(component.start),
      endTime: component.end ? new Date(component.end) : undefined,
      venueName: paramValueToString(component.location),
      city: feed.city,
      genre: component.categories?.[0],
      category: categorize(component.categories?.[0]),
    });
  }
  return events;
}
