import { categorize } from "@/lib/categories";
import { zonedTimeToUtc } from "@/lib/timezone";
import type { EventSearchQuery, EventSource, NormalizedEvent } from "./types";

// SeatGeek Platform API docs: https://platform.seatgeek.com/
const EVENTS_URL = "https://api.seatgeek.com/2/events";

type SeatGeekEvent = {
  id: number;
  title: string;
  short_title?: string;
  url: string;
  // No timezone designator (per SeatGeek's docs this is the venue's own wall-clock
  // time, not UTC) - must not be parsed with the bare `new Date()` constructor,
  // which would interpret it as the server's local time instead.
  datetime_local: string;
  taxonomies?: { name: string }[];
  venue?: { name?: string; city?: string; timezone?: string };
  performers?: { image?: string }[];
};

type SeatGeekResponse = {
  events: SeatGeekEvent[];
};

// Parses "YYYY-MM-DDTHH:mm:ss" into a Date whose UTC fields equal those
// numbers literally, independent of the server's own timezone.
function parseNaiveDateTimeAsUtc(isoLike: string): Date | null {
  const match = isoLike.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})/);
  if (!match) return null;
  const [, year, month, day, hour, minute, second] = match;
  return new Date(
    Date.UTC(Number(year), Number(month) - 1, Number(day), Number(hour), Number(minute), Number(second))
  );
}

function normalize(event: SeatGeekEvent): NormalizedEvent {
  const genre = event.taxonomies?.[0]?.name;
  const timezone = event.venue?.timezone;
  const naiveUtc = parseNaiveDateTimeAsUtc(event.datetime_local);
  const startTime = naiveUtc ? (timezone ? zonedTimeToUtc(naiveUtc, timezone) : naiveUtc) : new Date();

  return {
    sourceEventId: String(event.id),
    title: event.title ?? event.short_title ?? "Untitled event",
    url: event.url,
    startTime,
    venueName: event.venue?.name,
    city: event.venue?.city,
    genre,
    category: categorize(genre),
    imageUrl: event.performers?.[0]?.image,
    timezone,
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
