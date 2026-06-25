"use client";

import { useState } from "react";
import { addVenueSource, removeVenueSource } from "@/app/actions";

type VenueEntry = { id: string; url: string; label: string; readable: boolean };

export function TrackVenueWebsites({ initialSources }: { initialSources: VenueEntry[] }) {
  const [url, setUrl] = useState("");
  const [status, setStatus] = useState<"idle" | "loading">("idle");
  const [error, setError] = useState<string | null>(null);
  // Optimistic additions for this session (merged with initialSources for display)
  const [sessionAdded, setSessionAdded] = useState<VenueEntry[]>([]);

  // Merge server-rendered list with anything added this session (deduped by id)
  const allSources: VenueEntry[] = [
    ...initialSources,
    ...sessionAdded.filter((s) => !initialSources.some((i) => i.id === s.id)),
  ];
  const readable = allSources.filter((s) => s.readable);
  const unreadable = allSources.filter((s) => !s.readable);

  async function handleAdd() {
    const trimmed = url.trim();
    if (!trimmed) return;
    setStatus("loading");
    setError(null);
    try {
      const result = await addVenueSource(trimmed);
      setSessionAdded((prev) => [
        ...prev.filter((s) => s.id !== result.id),
        { id: result.id, url: trimmed, label: result.label, readable: result.readable },
      ]);
      setUrl("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add venue.");
    } finally {
      setStatus("idle");
    }
  }

  return (
    <div className="border rounded-lg p-4 bg-gray-50 text-gray-900 flex flex-col gap-3">
      <p className="text-sm font-medium">Track venue websites for events.</p>
      <div className="flex gap-2">
        <input
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleAdd()}
          placeholder="https://venuename.com/events"
          className="border rounded px-3 py-2 flex-1 text-sm bg-white text-gray-900"
        />
        <button
          type="button"
          onClick={handleAdd}
          disabled={status === "loading" || !url.trim()}
          className="bg-black text-white rounded px-3 py-2 text-sm disabled:opacity-50 whitespace-nowrap"
        >
          {status === "loading" ? "Checking..." : "Track"}
        </button>
      </div>

      {error && <p className="text-sm text-red-700">{error}</p>}

      {readable.length > 0 && (
        <div className="flex flex-col gap-1">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Readable venues</p>
          <ul className="flex flex-col gap-1">
            {readable.map((s) => (
              <li key={s.id} className="flex items-center justify-between gap-2 text-sm">
                <a
                  href={s.url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-blue-700 hover:underline truncate"
                >
                  {s.label}
                </a>
                <form action={removeVenueSource.bind(null, s.id)}>
                  <button type="submit" className="text-gray-400 hover:text-red-600 text-xs shrink-0">
                    Remove
                  </button>
                </form>
              </li>
            ))}
          </ul>
        </div>
      )}

      {unreadable.length > 0 && (
        <div className="flex flex-col gap-1">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Saved links</p>
          <ul className="flex flex-col gap-2">
            {unreadable.map((s) => (
              <li key={s.id} className="border rounded px-3 py-2 bg-white text-sm flex flex-col gap-1">
                <div className="flex items-center justify-between gap-2">
                  <a
                    href={s.url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-blue-700 hover:underline truncate"
                  >
                    {s.label}
                  </a>
                  <form action={removeVenueSource.bind(null, s.id)}>
                    <button type="submit" className="text-gray-400 hover:text-red-600 text-xs shrink-0">
                      Remove
                    </button>
                  </form>
                </div>
                <p className="text-xs text-gray-500">
                  This website is too difficult to read for widdle &apos;ol me ;(
                </p>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
