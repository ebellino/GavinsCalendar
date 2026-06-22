import { db } from "@/lib/db";
import { ticketmasterSource } from "./ticketmaster";
import { seatgeekSource } from "./seatgeek";
import { icsFeedSource } from "./icsFeed";
import { z2entBoulderTheaterSource } from "./scrapers/z2entBoulderTheater";
import type { EventSearchQuery, EventSource } from "./types";

// Add new adapters here as they're built. Eventbrite/Meetup are intentionally
// excluded: Eventbrite retired public event search in 2019, and Meetup's
// GraphQL API requires an approved Pro-account OAuth consumer to access.
// Scrapers (src/lib/sources/scrapers/) are bespoke per-site and registered
// individually here, unlike the generic API/ICS adapters above.
export const eventSources: EventSource[] = [
  ticketmasterSource,
  seatgeekSource,
  icsFeedSource,
  z2entBoulderTheaterSource,
];

// Queries every registered source in parallel, normalizes results, and upserts
// them into the Event table so the search UI always reads from the DB cache.
export async function searchAndCacheEvents(query: EventSearchQuery) {
  const results = await Promise.allSettled(
    eventSources.map((source) => source.search(query))
  );

  const events = results.flatMap((result, i) => {
    if (result.status === "rejected") {
      console.error(`Source "${eventSources[i].name}" failed:`, result.reason);
      return [];
    }
    return result.value.map((event) => ({ source: eventSources[i], event }));
  });

  await Promise.all(
    events.map(({ source, event }) =>
      db.event.upsert({
        where: { sourceName_sourceEventId: { sourceName: source.name, sourceEventId: event.sourceEventId } },
        create: { sourceName: source.name, ...event },
        update: event,
      })
    )
  );

  return events.map(({ event }) => event);
}
