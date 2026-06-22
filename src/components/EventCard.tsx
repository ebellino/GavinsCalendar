import type { Event, SavedEvent } from "@/generated/prisma/client";
import { saveEvent, unsaveEvent } from "@/app/actions";

// Formats in the venue's own local time (falling back to UTC when a source
// couldn't provide one) rather than the server's timezone - otherwise a show
// actually at 8pm would display as some unrelated hour depending on wherever
// this is hosted. Includes the zone abbreviation since a trip-planning search
// can span multiple timezones in one page.
function formatEventTime(date: Date, timezone: string | null): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: timezone ?? "UTC",
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  }).format(date);
}

export function EventCard({
  event,
}: {
  event: Event & { savedEvent: SavedEvent | null };
}) {
  const isSaved = event.savedEvent !== null;

  return (
    <div className="border rounded-lg p-4 flex gap-4">
      {event.imageUrl && (
        // eslint-disable-next-line @next/next/no-img-element -- external, unoptimized source images
        <img src={event.imageUrl} alt="" className="w-24 h-24 object-cover rounded" />
      )}
      <div className="flex-1">
        <a href={event.url} target="_blank" rel="noreferrer" className="font-semibold hover:underline">
          {event.title}
        </a>
        <p className="text-sm text-gray-600">{formatEventTime(event.startTime, event.timezone)}</p>
        <p className="text-sm text-gray-600">
          {[event.venueName, event.city].filter(Boolean).join(", ")}
        </p>
        {event.genre && <p className="text-xs text-gray-400">{event.genre}</p>}
      </div>
      <div className="flex flex-col gap-2">
        <form action={isSaved ? unsaveEvent : saveEvent}>
          <input type="hidden" name="eventId" value={event.id} />
          <button
            type="submit"
            className={`w-full rounded px-3 py-2 text-sm ${
              isSaved ? "bg-gray-200 text-gray-900" : "bg-black text-white"
            }`}
          >
            {isSaved ? "Saved ✓" : "Save"}
          </button>
        </form>
        <a
          href={`/api/events/${event.id}/ics`}
          className="rounded px-3 py-2 text-sm border text-center text-gray-900 whitespace-nowrap"
        >
          Add to Calendar
        </a>
      </div>
    </div>
  );
}
