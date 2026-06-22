import * as cheerio from "cheerio";
import type { EventSearchQuery, EventSource, NormalizedEvent } from "../types";

// Tier B scraper (see project notes): z2ent.com is a server-rendered Webflow
// site - the event list ships in the initial HTML with stable CMS class
// names, so this only needs a lightweight HTML parse, not a headless browser.
// Bespoke per-site by nature; if z2ent.com redesigns, only this one adapter
// breaks (caught and logged by the Promise.allSettled in sources/index.ts).
const PAGE_URL = "https://www.z2ent.com/venues-we-book/boulder-theater";
const VENUE_NAME = "Boulder Theater";
const CITY = "Boulder";

function parseEventDate(dateText: string): Date | null {
  const date = new Date(dateText);
  return Number.isNaN(date.getTime()) ? null : date;
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

      seen.add(detailHref);
      events.push({
        sourceEventId: detailHref,
        title,
        description: card.find(".event_title-wrapper p").first().text().trim() || undefined,
        url: new URL(detailHref, PAGE_URL).toString(),
        startTime,
        venueName: VENUE_NAME,
        city: CITY,
        genre: card.find("[fs-list-field='event-type']").first().text().trim() || undefined,
        imageUrl: card.find(".events_image").attr("src"),
      });
    });

    return events;
  },
};
