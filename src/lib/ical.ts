import type { ICalCalendar } from "ical-generator";
import type { Event } from "@/generated/prisma/client";

// Shared between the bulk subscription feed and the per-event download route
// so both produce identically-shaped VEVENT entries.
export function addEventToCalendar(calendar: ICalCalendar, event: Event) {
  calendar.createEvent({
    id: event.id,
    start: event.startTime,
    end: event.endTime ?? new Date(event.startTime.getTime() + 60 * 60 * 1000),
    summary: event.title,
    description: event.description ?? undefined,
    location: [event.venueName, event.city].filter(Boolean).join(", ") || undefined,
    url: event.url,
  });
}
