import { headers } from "next/headers";
import { db } from "@/lib/db";
import { searchAndCacheEvents } from "@/lib/sources";
import { getOrCreateFeedToken } from "@/lib/instance";
import { CATEGORY_DISPLAY_ORDER, CATEGORY_LABELS, type EventCategoryValue } from "@/lib/categories";
import { SearchForm } from "@/components/SearchForm";
import { EventCard } from "@/components/EventCard";
import { FeedLink } from "@/components/FeedLink";
import { DiscoverLocalSources } from "@/components/DiscoverLocalSources";
import { SavedEventsSection } from "@/components/SavedEventsSection";
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

  const now = new Date();
  const today = new Date(now);
  today.setUTCHours(0, 0, 0, 0);

  // A range entirely in the past, or reversed (end before start), can never
  // match anything - catch it explicitly rather than silently wasting API
  // calls on a request guaranteed to return nothing. The date inputs also
  // have a `min` of today, but that's client-side only and a URL can be
  // hand-edited around it, so this check is the real enforcement.
  const invalidRange = Boolean((endDate && endDate < today) || (startDate && endDate && startDate > endDate));

  if (hasQuery && !invalidRange) {
    // Best-effort refresh: if a source API is down, fall back to whatever's already cached.
    try {
      await searchAndCacheEvents({ ...query, startDate, endDate });
    } catch (error) {
      console.error("Event source refresh failed:", error);
    }
  }

  // Never show past events, even if an explicit startDate is in the past.
  const effectiveStartDate = startDate && startDate > now ? startDate : now;

  const events = invalidRange
    ? []
    : await db.event.findMany({
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

  const savedEvents = await db.event.findMany({
    where: { savedEvent: { isNot: null }, startTime: { gte: new Date() } },
    include: { savedEvent: true },
    orderBy: { startTime: "asc" },
  });

  // Autofill suggestions drawn from whatever's actually been cached, not a
  // fixed list - reflects the real, growing universe of values as more
  // sources/cities get used.
  const [cityOptions, genreOptions] = await Promise.all([
    db.event.findMany({
      where: { city: { not: null } },
      distinct: ["city"],
      select: { city: true },
      orderBy: { city: "asc" },
      take: 50,
    }),
    db.event.findMany({
      where: { genre: { not: null } },
      distinct: ["genre"],
      select: { genre: true },
      orderBy: { genre: "asc" },
      take: 50,
    }),
  ]);

  const feedToken = await getOrCreateFeedToken();
  const requestHeaders = await headers();
  const host = requestHeaders.get("host") ?? "localhost:3000";
  const protocol = requestHeaders.get("x-forwarded-proto") ?? "http";
  const feedUrl = `${protocol}://${host}/feed/${feedToken}`;

  return (
    <main className="max-w-3xl mx-auto p-6 flex flex-col gap-6">
      <h1 className="text-2xl font-bold">Event Calendar</h1>
      <SavedEventsSection savedEvents={savedEvents} />
      <FeedLink feedUrl={feedUrl} />
      <DiscoverLocalSources defaultCity={query.city} />
      <SearchForm
        defaultValues={query}
        cityOptions={cityOptions.map((e) => e.city!)}
        genreOptions={genreOptions.map((e) => e.genre!)}
      />
      <div className="flex flex-col gap-6">
        {invalidRange && (
          <p className="text-red-700 text-sm">
            That date range isn&apos;t valid — the end date must be today or later, and on or after the start date.
          </p>
        )}
        {!invalidRange && events.length === 0 && (
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
