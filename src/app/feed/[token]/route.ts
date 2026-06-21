import ical from "ical-generator";
import { db } from "@/lib/db";

// A private, per-instance iCal feed. Friends add this URL once via
// "Subscribe to Calendar" in Google/Apple/Outlook and saved events show up
// automatically — no OAuth, no per-provider integration.
export async function GET(_request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;

  const settings = await db.instanceSettings.findUnique({ where: { feedToken: token } });
  if (!settings) {
    return new Response("Not found", { status: 404 });
  }

  const savedEvents = await db.savedEvent.findMany({
    include: { event: true },
    orderBy: { event: { startTime: "asc" } },
  });

  const calendar = ical({ name: "Event Calendar" });
  for (const { event } of savedEvents) {
    calendar.createEvent({
      id: event.id,
      start: event.startTime,
      end: event.endTime ?? new Date(event.startTime.getTime() + 60 * 60 * 1000),
      summary: event.title,
      description: event.description ?? undefined,
      location: [event.venueName, event.city].filter(Boolean).join(", ") || undefined,
      url: event.url,
    });
  }

  return new Response(calendar.toString(), {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": "attachment; filename=events.ics",
    },
  });
}
