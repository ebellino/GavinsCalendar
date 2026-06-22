import { db } from "@/lib/db";

// Deletes data that can never be useful again, run once at server startup.
// Event rows cascade-delete their SavedEvent row too (schema's onDelete:
// Cascade) - once a show has passed, there's no reason to keep "saved for
// later" around for it.
//
// This doesn't replace the startTime >= now filters in page.tsx/the feed
// route - those still matter for whatever passes *during* a run between
// restarts. This just keeps storage from growing unbounded across restarts.
export async function cleanupPastData(): Promise<void> {
  const now = new Date();

  const [deletedEvents, deletedRanges] = await Promise.all([
    db.event.deleteMany({ where: { startTime: { lt: now } } }),
    db.searchCacheRange.deleteMany({ where: { cachedEnd: { lt: now } } }),
  ]);

  console.log(
    `[startup cleanup] removed ${deletedEvents.count} past event(s), ${deletedRanges.count} stale cache range(s)`
  );
}
