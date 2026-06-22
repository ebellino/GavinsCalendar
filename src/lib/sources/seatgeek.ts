import { categorize } from "@/lib/categories";
import type { EventSearchQuery, EventSource, NormalizedEvent } from "./types";

// SeatGeek Platform API docs: https://platform.seatgeek.com/
const EVENTS_URL = "https://api.seatgeek.com/2/events";

type SeatGeekEvent = {
  id: number;
  title: string;
  short_title?: string;
  url: string;
  datetime_local: string;
  taxonomies?: { name: string }[];
  venue?: { name?: string; city?: string };
  performers?: { image?: string }[];
};

type SeatGeekResponse = {
  events: SeatGeekEvent[];
};

function normalize(event: SeatGeekEvent): NormalizedEvent {
  const genre = event.taxonomies?.[0]?.name;
  return {
    sourceEventId: String(event.id),
    title: event.title ?? event.short_title ?? "Untitled event",
    url: event.url,
    startTime: new Date(event.datetime_local),
    venueName: event.venue?.name,
    city: event.venue?.city,
    genre,
    category: categorize(genre),
    imageUrl: event.performers?.[0]?.image,
  };
}

function toDateOnly(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export const seatgeekSource: EventSource = {
  name: "seatgeek",

  async search(query: EventSearchQuery): Promise<NormalizedEvent[]> {
    const clientId = process.env.SEATGEEK_CLIENT_ID;
    if (!clientId) return [];

    const params = new URLSearchParams({ client_id: clientId, per_page: "50" });
    if (query.keyword) params.set("q", query.keyword);
    if (query.genre) params.set("taxonomies.name", query.genre);
    if (query.city) params.set("venue.city", query.city);
    if (query.startDate) params.set("datetime_local.gte", toDateOnly(query.startDate));
    if (query.endDate) params.set("datetime_local.lte", toDateOnly(query.endDate));

    const res = await fetch(`${EVENTS_URL}?${params.toString()}`);
    if (!res.ok) {
      throw new Error(`SeatGeek search failed: ${res.status} ${res.statusText}`);
    }

    const data: SeatGeekResponse = await res.json();
    return (data.events ?? []).map(normalize);
  },
};
