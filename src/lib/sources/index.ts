import { db } from "@/lib/db";
import { ticketmasterSource } from "./ticketmaster";
import { seatgeekSource } from "./seatgeek";
import { icsFeedSource } from "./icsFeed";
import { z2entBoulderTheaterSource } from "./scrapers/z2entBoulderTheater";
import { venueScraperSource } from "./venueScraperSource";
import { buildFilterKey, recordCacheRefresh, resolveCachePlan } from "@/lib/searchCache";
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
  venueScraperSource,
];

// Queries every registered source in parallel, normalizes results, and upserts
// them into the Event table so the search UI always reads from the DB cache.
//
// For explicit date-range searches, each source first checks whether its
// cached range already covers the request (src/lib/searchCache.ts) - fully
// covered and fresh means that source is skipped entirely this round, since
// the Event table already has what's needed. Open-ended searches (no date
// range given) bypass this and always refetch, same as before caching existed.
export async function searchAndCacheEvents(query: EventSearchQuery) {
  const useRangeCache = Boolean(query.startDate && query.endDate);
  const filterKey = useRangeCache ? buildFilterKey(query) : null;

  const results = await Promise.allSettled(
    eventSources.map(async (source) => {
      if (!useRangeCache || !filterKey) {
        return source.search(query);
      }

      const plan = await resolveCachePlan(source.name, filterKey, query.startDate!, query.endDate!);
      if (plan.action === "skip") {
        console.log(`[cache] ${source.name} "${filterKey}": skipped, already covered`);
        return [];
      }

      console.log(
        `[cache] ${source.name} "${filterKey}": fetching ${plan.fetchStart.toISOString()} - ${plan.fetchEnd.toISOString()}`
      );
      const events = await source.search({ ...query, startDate: plan.fetchStart, endDate: plan.fetchEnd });
      await recordCacheRefresh(source.name, filterKey, plan.fetchStart, plan.fetchEnd);
      return events;
    })
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
