// Fixed, source-agnostic taxonomy so results from Ticketmaster, SeatGeek, ICS
// feeds, and scrapers can all be grouped into the same set of sections.
// Deliberately a flat keyword match against whatever raw genre/type text a
// source provides, rather than per-source enum tables - one shared mapping
// is easier to extend than four bespoke ones as more sources get added.
export const EVENT_CATEGORIES = [
  "MUSIC",
  "SPORTS",
  "COMEDY",
  "ARTS_THEATER",
  "FILM",
  "FOOD_DRINK",
  "COMMUNITY",
  "FAMILY",
  "OTHER",
] as const;

export type EventCategoryValue = (typeof EVENT_CATEGORIES)[number];

export const CATEGORY_LABELS: Record<EventCategoryValue, string> = {
  MUSIC: "Music",
  SPORTS: "Sports",
  COMEDY: "Comedy",
  ARTS_THEATER: "Arts & Theater",
  FILM: "Film",
  FOOD_DRINK: "Food & Drink",
  COMMUNITY: "Community",
  FAMILY: "Family",
  OTHER: "Other",
};

// Order sections should display in - fixed rather than alphabetical so the
// page doesn't reshuffle section order between searches.
export const CATEGORY_DISPLAY_ORDER: EventCategoryValue[] = [
  "MUSIC",
  "SPORTS",
  "COMEDY",
  "ARTS_THEATER",
  "FILM",
  "FOOD_DRINK",
  "FAMILY",
  "COMMUNITY",
  "OTHER",
];

const KEYWORD_MAP: [RegExp, EventCategoryValue][] = [
  [/comedy|stand-?up/i, "COMEDY"],
  [/theat(er|re)|dance|ballet|opera|musical/i, "ARTS_THEATER"],
  [/film|movie|cinema/i, "FILM"],
  [/food|drink|beer|wine|brewery|tasting|culinary/i, "FOOD_DRINK"],
  [/family|kids?|children/i, "FAMILY"],
  [/sport|football|basketball|baseball|soccer|hockey|golf|tennis|mma|wrestl|racing/i, "SPORTS"],
  [/music|concert|band|rock|pop|jazz|hip.?hop|rap|country|classical|dj/i, "MUSIC"],
  [/community|market|fair|workshop|class|meetup|civic/i, "COMMUNITY"],
];

export function categorize(rawText: string | undefined | null): EventCategoryValue {
  if (!rawText) return "OTHER";
  for (const [pattern, category] of KEYWORD_MAP) {
    if (pattern.test(rawText)) return category;
  }
  return "OTHER";
}
