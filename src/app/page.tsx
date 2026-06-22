import { headers } from "next/headers";
import { db } from "@/lib/db";
import { searchAndCacheEvents } from "@/lib/sources";
import { getOrCreateFeedToken } from "@/lib/instance";
import { CATEGORY_DISPLAY_ORDER, CATEGORY_LABELS, type EventCategoryValue } from "@/lib/categories";
import { SearchForm } from "@/components/SearchForm";
import { EventCard } from "@/components/EventCard";
import { FeedLink } from "@/components/FeedLink";
import { DiscoverLocalSources } from "@/components/DiscoverLocalSources";
import type { Event, SavedEvent } from "@/generated/prisma/client";

type SearchParams = {
  keyword?: string;
  genre?: string;
  city?: string;
  startDate?: string;
  endDate?: string;
};

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const query = await searchParams;
  const hasQuery = Boolean(query.keyword || query.genre || query.city || query.startDate || query.endDate);

  const startDate = query.startDate ? new Date(query.startDate) : undefined;
  const endDate = query.endDate ? new Date(query.endDate) : undefined;
  // Inclusive of the whole end day, since the input only carries a date, not a time.
  if (endDate) endDate.setUTCHours(23, 59, 59, 999);

  if (hasQuery) {
    // Best-effort refresh: if a source API is down, fall back to whatever's already cached.
    try {
      await searchAndCacheEvents({ ...query, startDate, endDate });
    } catch (error) {
      console.error("Event source refresh failed:", error);
    }
  }

  const now = new Date();
  // Never show past events, even if an explicit startDate is in the past.
  const effectiveStartDate = startDate && startDate > now ? startDate : now;

  const events = await db.event.findMany({
    where: {
      title: query.keyword ? { contains: query.keyword, mode: "insensitive" } : undefined,
      genre: query.genre ? { contains: query.genre, mode: "insensitive" } : undefined,
      city: query.city ? { contains: query.city, mode: "insensitive" } : undefined,
      startTime: { gte: effectiveStartDate, lte: endDate },
    },
    include: { savedEvent: true },
    orderBy: { startTime: "asc" },
    take: 200,
  });

  const eventsByCategory = new Map<EventCategoryValue, (Event & { savedEvent: SavedEvent | null })[]>();
  for (const event of events) {
    const category = event.category as EventCategoryValue;
    const bucket = eventsByCategory.get(category) ?? [];
    bucket.push(event);
    eventsByCategory.set(category, bucket);
  }

  const feedToken = await getOrCreateFeedToken();
  const requestHeaders = await headers();
  const host = requestHeaders.get("host") ?? "localhost:3000";
  const protocol = requestHeaders.get("x-forwarded-proto") ?? "http";
  const feedUrl = `${protocol}://${host}/feed/${feedToken}`;

  return (
    <main className="max-w-3xl mx-auto p-6 flex flex-col gap-6">
      <h1 className="text-2xl font-bold">Event Calendar</h1>
      <FeedLink feedUrl={feedUrl} />
      <DiscoverLocalSources defaultCity={query.city} />
      <SearchForm defaultValues={query} />
      <div className="flex flex-col gap-6">
        {events.length === 0 && (
          <p className="text-gray-500">
            {hasQuery ? "No events found." : "Search above to find events."}
          </p>
        )}
        {CATEGORY_DISPLAY_ORDER.map((category) => {
          const categoryEvents = eventsByCategory.get(category);
          if (!categoryEvents || categoryEvents.length === 0) return null;
          return (
            <section key={category} className="flex flex-col gap-3">
              <h2 className="text-lg font-semibold">{CATEGORY_LABELS[category]}</h2>
              {categoryEvents.map((event) => (
                <EventCard key={event.id} event={event} />
              ))}
            </section>
          );
        })}
      </div>
    </main>
  );
}
