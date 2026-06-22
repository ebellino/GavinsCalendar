import type { Event, SavedEvent } from "@/generated/prisma/client";
import { EventCard } from "@/components/EventCard";

export function SavedEventsSection({
  savedEvents,
}: {
  savedEvents: (Event & { savedEvent: SavedEvent | null })[];
}) {
  return (
    <details className="border rounded-lg p-4" open>
      <summary className="font-semibold cursor-pointer">
        Your saved events ({savedEvents.length})
      </summary>
      <div className="flex flex-col gap-3 mt-3">
        {savedEvents.length === 0 && (
          <p className="text-gray-500 text-sm">Nothing saved yet — save an event below to see it here.</p>
        )}
        {savedEvents.map((event) => (
          <EventCard key={event.id} event={event} />
        ))}
      </div>
    </details>
  );
}
