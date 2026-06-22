import { headers } from "next/headers";
import { db } from "@/lib/db";
import { searchAndCacheEvents } from "@/lib/sources";
import { getOrCreateFeedToken } from "@/lib/instance";
import { SearchForm } from "@/components/SearchForm";
import { EventCard } from "@/components/EventCard";
import { FeedLink } from "@/components/FeedLink";
import { DiscoverLocalSources } from "@/components/DiscoverLocalSources";

type SearchParams = { keyword?: string; genre?: string; city?: string };

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const query = await searchParams;
  const hasQuery = Boolean(query.keyword || query.genre || query.city);

  if (hasQuery) {
    // Best-effort refresh: if a source API is down, fall back to whatever's already cached.
    try {
      await searchAndCacheEvents(query);
    } catch (error) {
      console.error("Event source refresh failed:", error);
    }
  }

  const events = await db.event.findMany({
    where: {
      title: query.keyword ? { contains: query.keyword, mode: "insensitive" } : undefined,
      genre: query.genre ? { contains: query.genre, mode: "insensitive" } : undefined,
      city: query.city ? { contains: query.city, mode: "insensitive" } : undefined,
      startTime: { gte: new Date() },
    },
    include: { savedEvent: true },
    orderBy: { startTime: "asc" },
    take: 50,
  });

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
      <div className="flex flex-col gap-3">
        {events.length === 0 && (
          <p className="text-gray-500">
            {hasQuery ? "No events found." : "Search above to find events."}
          </p>
        )}
        {events.map((event) => (
          <EventCard key={event.id} event={event} />
        ))}
      </div>
    </main>
  );
}
