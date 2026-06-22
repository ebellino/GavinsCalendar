// Converts a wall-clock time in a specific IANA timezone to the correct UTC
// instant, without relying on the server's own timezone (the server runs in
// UTC in Docker, but event listings give times local to the venue).
export function zonedTimeToUtc(naiveUtc: Date, timeZone: string): Date {
  const offsetMinutes = getTimeZoneOffsetMinutes(naiveUtc, timeZone);
  return new Date(naiveUtc.getTime() - offsetMinutes * 60_000);
}

// How many minutes ahead of UTC `timeZone` is, at the moment represented by
// `naiveUtc`'s UTC fields (good enough for event listings; only inaccurate
// in the rare case a time falls exactly within a DST transition window).
function getTimeZoneOffsetMinutes(naiveUtc: Date, timeZone: string): number {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  const parts: Record<string, string> = {};
  for (const part of formatter.formatToParts(naiveUtc)) parts[part.type] = part.value;

  const asIfUtc = Date.UTC(
    Number(parts.year),
    Number(parts.month) - 1,
    Number(parts.day),
    Number(parts.hour),
    Number(parts.minute),
    Number(parts.second)
  );
  return (asIfUtc - naiveUtc.getTime()) / 60_000;
}
