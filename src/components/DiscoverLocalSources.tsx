"use client";

import { useState } from "react";
import { approveLocalFeed, discoverFeedsForCity } from "@/app/actions";
import type { DiscoveryCandidate } from "@/lib/discovery";

export function DiscoverLocalSources({ defaultCity }: { defaultCity?: string }) {
  const [city, setCity] = useState(defaultCity ?? "");
  const [status, setStatus] = useState<"idle" | "loading" | "done">("idle");
  const [candidates, setCandidates] = useState<DiscoveryCandidate[]>([]);
  const [approved, setApproved] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);

  async function handleDiscover() {
    if (!city.trim()) return;
    setStatus("loading");
    setError(null);
    try {
      const results = await discoverFeedsForCity(city.trim());
      setCandidates(results);
      setStatus("done");
    } catch {
      setError("Discovery failed — try again in a moment.");
      setStatus("idle");
    }
  }

  async function handleApprove(candidate: DiscoveryCandidate) {
    await approveLocalFeed(city.trim(), candidate);
    setApproved((prev) => new Set(prev).add(candidate.url));
  }

  return (
    <div className="border rounded-lg p-4 bg-gray-50 text-gray-900 flex flex-col gap-3">
      <p className="text-sm font-medium">
        Discover local event calendars (libraries, venues, community orgs) for a city.
      </p>
      <div className="flex gap-2">
        <input
          type="text"
          value={city}
          onChange={(e) => setCity(e.target.value)}
          placeholder="City..."
          className="border rounded px-3 py-2 flex-1 text-sm bg-white text-gray-900"
        />
        <button
          type="button"
          onClick={handleDiscover}
          disabled={status === "loading" || !city.trim()}
          className="bg-black text-white rounded px-3 py-2 text-sm disabled:opacity-50"
        >
          {status === "loading" ? "Searching..." : "Discover Local Sources"}
        </button>
      </div>

      {error && <p className="text-sm text-red-700">{error}</p>}

      {status === "done" && candidates.length === 0 && (
        <p className="text-sm text-gray-600">No usable calendar feeds found for &quot;{city}&quot;.</p>
      )}

      {candidates.length > 0 && (
        <ul className="flex flex-col gap-2">
          {candidates.map((candidate) => (
            <li
              key={candidate.url}
              className="flex items-center justify-between gap-3 border rounded px-3 py-2 bg-white text-sm"
            >
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{candidate.label}</p>
                <p className="text-gray-500 truncate">{candidate.url}</p>
                <p className="text-gray-500">
                  {candidate.eventCount} event{candidate.eventCount === 1 ? "" : "s"} found
                  {candidate.cityMatch ? " · mentions this city" : " · city match unconfirmed"}
                </p>
              </div>
              <button
                type="button"
                onClick={() => handleApprove(candidate)}
                disabled={approved.has(candidate.url)}
                className="rounded px-3 py-2 text-sm bg-gray-200 text-gray-900 disabled:opacity-50 whitespace-nowrap"
              >
                {approved.has(candidate.url) ? "Added ✓" : "Add this feed"}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
