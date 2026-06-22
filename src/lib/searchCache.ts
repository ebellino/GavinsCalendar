import { db } from "@/lib/db";

// How long a tracked range is trusted before a search against it re-hits the
// source's API even if the requested range is fully covered.
const TTL_MS = 30 * 60 * 1000;

export type CategoricalFilters = { keyword?: string; genre?: string; city?: string };

// Categorical filters (city/genre/keyword) get an exact-match key - there's
// no partial overlap between "Boulder" and "Denver" the way there is between
// two date ranges, so normalization (not interval logic) is all they need.
export function buildFilterKey(filters: CategoricalFilters): string {
  const normalize = (value: string | undefined) => (value ?? "").trim().toLowerCase();
  return `keyword=${normalize(filters.keyword)}|genre=${normalize(filters.genre)}|city=${normalize(filters.city)}`;
}

export type CachePlan =
  | { action: "skip" }
  | { action: "fetch"; fetchStart: Date; fetchEnd: Date };

// Decides, for one source and one filter combination, whether the requested
// date range is already covered by a fresh tracked range, and if not, the
// minimal-or-wider range that needs fetching to bring it up to date.
export async function resolveCachePlan(
  sourceName: string,
  filterKey: string,
  requestedStart: Date,
  requestedEnd: Date
): Promise<CachePlan> {
  const existing = await db.searchCacheRange.findUnique({
    where: { sourceName_filterKey: { sourceName, filterKey } },
  });

  if (!existing) {
    return { action: "fetch", fetchStart: requestedStart, fetchEnd: requestedEnd };
  }

  const isStale = Date.now() - existing.lastRefreshedAt.getTime() > TTL_MS;
  if (isStale) {
    return { action: "fetch", fetchStart: requestedStart, fetchEnd: requestedEnd };
  }

  const overlapsOrAdjacent = requestedStart <= existing.cachedEnd && requestedEnd >= existing.cachedStart;
  if (!overlapsOrAdjacent) {
    // Disjoint from what's tracked - fetch just the new range, abandoning
    // the old one rather than tracking multiple disjoint ranges.
    return { action: "fetch", fetchStart: requestedStart, fetchEnd: requestedEnd };
  }

  const fullyCovered = requestedStart >= existing.cachedStart && requestedEnd <= existing.cachedEnd;
  if (fullyCovered) {
    return { action: "skip" };
  }

  // Partial overlap/extension - fetch the union. Slightly more than the
  // strict minimum (re-covers the already-cached portion too), but avoids
  // ever needing two separate API calls for a single search.
  return {
    action: "fetch",
    fetchStart: requestedStart < existing.cachedStart ? requestedStart : existing.cachedStart,
    fetchEnd: requestedEnd > existing.cachedEnd ? requestedEnd : existing.cachedEnd,
  };
}

export async function recordCacheRefresh(
  sourceName: string,
  filterKey: string,
  fetchStart: Date,
  fetchEnd: Date
): Promise<void> {
  await db.searchCacheRange.upsert({
    where: { sourceName_filterKey: { sourceName, filterKey } },
    create: { sourceName, filterKey, cachedStart: fetchStart, cachedEnd: fetchEnd },
    update: { cachedStart: fetchStart, cachedEnd: fetchEnd, lastRefreshedAt: new Date() },
  });
}
