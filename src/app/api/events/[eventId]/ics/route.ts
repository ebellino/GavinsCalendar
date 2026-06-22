import ical from "ical-generator";
import { db } from "@/lib/db";
import { addEventToCalendar } from "@/lib/ical";

// One-shot single-event download, independent of whether the event is saved.
// Fixes the reachability problem with the bulk feed (a cloud calendar can't
// subscribe to localhost, and the container isn't always running): this is a
// one-time import into whatever calendar app opens it, no ongoing dependency
// on this server afterward.
export async function GET(_request: Request, { params }: { params: Promise<{ eventId: string }> }) {
  const { eventId } = await params;

  const event = await db.event.findUnique({ where: { id: eventId } });
  if (!event) {
    return new Response("Not found", { status: 404 });
  }

  const calendar = ical({ name: event.title });
  addEventToCalendar(calendar, event);

  return new Response(calendar.toString(), {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="${event.id}.ics"`,
    },
  });
}
