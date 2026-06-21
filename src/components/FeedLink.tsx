"use client";

import { useState } from "react";

export function FeedLink({ feedUrl }: { feedUrl: string }) {
  const [copied, setCopied] = useState(false);

  return (
    <div className="border rounded-lg p-4 bg-gray-50 flex flex-col gap-2">
      <p className="text-sm font-medium">
        Your calendar feed — add this URL once via &quot;Subscribe to Calendar&quot; in
        Google/Apple/Outlook Calendar to see saved events automatically.
      </p>
      <div className="flex gap-2">
        <input
          readOnly
          value={feedUrl}
          className="border rounded px-3 py-2 flex-1 text-sm bg-white"
          onFocus={(e) => e.currentTarget.select()}
        />
        <button
          type="button"
          className="bg-black text-white rounded px-3 py-2 text-sm"
          onClick={() => {
            navigator.clipboard.writeText(feedUrl);
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
          }}
        >
          {copied ? "Copied!" : "Copy"}
        </button>
      </div>
    </div>
  );
}
