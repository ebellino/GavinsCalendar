import { categorize } from "@/lib/categories";
import type { EventSearchQuery, EventSource, NormalizedEvent } from "./types";

// Ticketmaster Discovery API v2 docs: https://developer.ticketmaster.com/products-and-docs/apis/discovery-api/v2/
const DISCOVERY_URL = "https://app.ticketmaster.com/discovery/v2/events.json";

type TicketmasterEvent = {
  id: string;
  name: string;
  url: string;
  info?: string;
  dates: { start: { dateTime?: string }; end?: { dateTime?: string } };
  classifications?: { genre?: { name?: string }; segment?: { name?: string } }[];
  images?: { url: string }[];
  _embedded?: { venues?: { name?: string; city?: { name?: string }; timezone?: string }[] };
};

type TicketmasterResponse = {
  _embedded?: { events?: TicketmasterEvent[] };
};

// Ticketmaster requires "YYYY-MM-DDTHH:mm:ssZ" with no milliseconds.
function toTicketmasterDateTime(date: Date, endOfDay = false): string {
  const d = new Date(date);
  if (endOfDay) d.setUTCHours(23, 59, 59, 0);
  else d.setUTCHours(0, 0, 0, 0);
  return d.toISOString().split(".")[0] + "Z";
}

function normalize(event: TicketmasterEvent): NormalizedEvent {
  const venue = event._embedded?.venues?.[0];
  const genre = event.classifications?.[0]?.genre?.name;
  // "segment" is Ticketmaster's broad top-level grouping (Music, Sports, Arts
  // & Theatre, Film, ...) - a better signal for our category than the more
  // granular "genre" (Rock, Football, ...), which we still keep for display.
  const segment = event.classifications?.[0]?.segment?.name;
  return {
    sourceEventId: event.id,
    title: event.name,
    description: event.info,
    url: event.url,
    startTime: new Date(event.dates.start.dateTime ?? Date.now()),
    endTime: event.dates.end?.dateTime ? new Date(event.dates.end.dateTime) : undefined,
    venueName: venue?.name,
    city: venue?.city?.name,
    genre,
    category: categorize(segment ?? genre),
    imageUrl: event.images?.[0]?.url,
    timezone: venue?.timezone,
  };
}

export const ticketmasterSource: EventSource = {
  name: "ticketmaster",

  async search(query: EventSearchQuery): Promise<NormalizedEvent[]> {
    const apiKey = process.env.TICKETMASTER_API_KEY;
    if (!apiKey) return [];

    const params = new URLSearchParams({ apikey: apiKey, size: "50" });
    if (query.keyword) params.set("keyword", query.keyword);
    if (query.genre) params.set("classificationName", query.genre);
    if (query.city) params.set("city", query.city);
    if (query.startDate) params.set("startDateTime", toTicketmasterDateTime(query.startDate));
    if (query.endDate) params.set("endDateTime", toTicketmasterDateTime(query.endDate, true));

    const res = await fetch(`${DISCOVERY_URL}?${params.toString()}`);
    if (!res.ok) {
      throw new Error(`Ticketmaster search failed: ${res.status} ${res.statusText}`);
    }

    const data: TicketmasterResponse = await res.json();
    return (data._embedded?.events ?? []).map(normalize);
  },
};
