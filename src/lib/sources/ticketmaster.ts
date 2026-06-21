import type { EventSearchQuery, EventSource, NormalizedEvent } from "./types";

// Ticketmaster Discovery API v2 docs: https://developer.ticketmaster.com/products-and-docs/apis/discovery-api/v2/
const DISCOVERY_URL = "https://app.ticketmaster.com/discovery/v2/events.json";

type TicketmasterEvent = {
  id: string;
  name: string;
  url: string;
  info?: string;
  dates: { start: { dateTime?: string }; end?: { dateTime?: string } };
  classifications?: { genre?: { name?: string } }[];
  images?: { url: string }[];
  _embedded?: { venues?: { name?: string; city?: { name?: string } }[] };
};

type TicketmasterResponse = {
  _embedded?: { events?: TicketmasterEvent[] };
};

function normalize(event: TicketmasterEvent): NormalizedEvent {
  const venue = event._embedded?.venues?.[0];
  return {
    sourceEventId: event.id,
    title: event.name,
    description: event.info,
    url: event.url,
    startTime: new Date(event.dates.start.dateTime ?? Date.now()),
    endTime: event.dates.end?.dateTime ? new Date(event.dates.end.dateTime) : undefined,
    venueName: venue?.name,
    city: venue?.city?.name,
    genre: event.classifications?.[0]?.genre?.name,
    imageUrl: event.images?.[0]?.url,
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

    const res = await fetch(`${DISCOVERY_URL}?${params.toString()}`);
    if (!res.ok) {
      throw new Error(`Ticketmaster search failed: ${res.status} ${res.statusText}`);
    }

    const data: TicketmasterResponse = await res.json();
    return (data._embedded?.events ?? []).map(normalize);
  },
};
