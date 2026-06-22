import type { EventCategoryValue } from "@/lib/categories";

// Common shape every source adapter normalizes its API's events into,
// so the rest of the app never needs to know which API an event came from.
export type NormalizedEvent = {
  sourceEventId: string;
  title: string;
  description?: string;
  url: string;
  startTime: Date;
  endTime?: Date;
  venueName?: string;
  city?: string;
  genre?: string;
  category: EventCategoryValue;
  imageUrl?: string;
};

export type EventSearchQuery = {
  keyword?: string;
  genre?: string;
  city?: string;
  // Inclusive date-only bounds (no time component) - lets a search scope to
  // a specific trip/window rather than just "everything upcoming".
  startDate?: Date;
  endDate?: Date;
};

export interface EventSource {
  // Unique key stored as Event.sourceName and used for upsert dedup.
  name: string;
  search(query: EventSearchQuery): Promise<NormalizedEvent[]>;
}
