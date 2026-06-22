import * as cheerio from "cheerio";
import { categorize } from "@/lib/categories";
import { zonedTimeToUtc } from "@/lib/timezone";
import type { EventSearchQuery, EventSource, NormalizedEvent } from "../types";

// Tier B scraper (see project notes): z2ent.com is a server-rendered Webflow
// site - the event list ships in the initial HTML with stable CMS class
// names, so this only needs a lightweight HTML parse, not a headless browser.
// Bespoke per-site by nature; if z2ent.com redesigns, only this one adapter
// breaks (caught and logged by the Promise.allSettled in sources/index.ts).
const PAGE_URL = "https://www.z2ent.com/venues-we-book/boulder-theater";
const VENUE_NAME = "Boulder Theater";
const CITY = "Boulder";
const VENUE_TIMEZONE = "America/Denver";

const MONTHS: Record<string, number> = {
  Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5,
  Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11,
};

// The page lists times like "Jun 25, 2026 8:00 PM" with no timezone - that's
// always Mountain Time (the venue's), not whatever timezone the server
// happens to run in. Parsed manually (rather than via `new Date(text)`) so
// the result doesn't depend on the server's local timezone at all.
function parseEventDate(dateText: string): Date | null {
  const match = dateText.match(/^([A-Za-z]{3})[a-z]* (\d{1,2}), (\d{4}) (\d{1,2}):(\d{2}) (AM|PM)$/);
  if (!match) return null;
  const [, monthStr, day, year, hourStr, minute, meridiem] = match;
  const month = MONTHS[monthStr];
  if (month === undefined) return null;

  let hour = Number(hourStr) % 12;
  if (meridiem === "PM") hour += 12;

  const naiveUtc = new Date(Date.UTC(Number(year), month, Number(day), hour, Number(minute)));
  return zonedTimeToUtc(naiveUtc, VENUE_TIMEZONE);
}

export const z2entBoulderTheaterSource: EventSource = {
  name: "z2ent-boulder-theater",

  async search(query: EventSearchQuery): Promise<NormalizedEvent[]> {
    if (query.city && !query.city.toLowerCase().includes("boulder")) return [];

    const res = await fetch(PAGE_URL);
    if (!res.ok) {
      throw new Error(`z2ent Boulder Theater page fetch failed: ${res.status} ${res.statusText}`);
    }
    const html = await res.text();
    const $ = cheerio.load(html);

    // The page renders the same events in both a "Calendar" and "List" tab,
    // both matching .events_item - dedupe by detail-page slug.
    const seen = new Set<string>();
    const events: NormalizedEvent[] = [];
    $(".events_item").each((_, el) => {
      const card = $(el);

      const detailHref = card.find(".events_image-wrapper").attr("href");
      if (!detailHref || seen.has(detailHref)) return;

      const dateText = card.find(".event_top-wrapper .date > div").last().text().trim();
      const startTime = parseEventDate(dateText);
      if (!startTime) return;

      const title = card.find("h3.heading-style-h5").first().text().trim();
      if (!title) return;

      const genre = card.find("[fs-list-field='event-type']").first().text().trim() || undefined;

      seen.add(detailHref);
      events.push({
        sourceEventId: detailHref,
        title,
        description: card.find(".event_title-wrapper p").first().text().trim() || undefined,
        url: new URL(detailHref, PAGE_URL).toString(),
        startTime,
        venueName: VENUE_NAME,
        city: CITY,
        genre,
        category: categorize(genre),
        imageUrl: card.find(".events_image").attr("src"),
        timezone: VENUE_TIMEZONE,
      });
    });

    // The page has no date-range query param - filter post-scrape instead.
    return events.filter((event) => {
      if (query.startDate && event.startTime < query.startDate) return false;
      if (query.endDate && event.startTime > query.endDate) return false;
      return true;
    });
  },
};
