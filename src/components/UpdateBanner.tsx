import { checkForUpdate } from "@/lib/updateCheck";

export async function UpdateBanner() {
  const update = await checkForUpdate();
  if (!update) return null;

  return (
    <div className="bg-amber-100 border border-amber-300 text-amber-900 text-sm px-4 py-2 flex items-center justify-between gap-4">
      <span>
        Update available: {update.currentVersion} → {update.latestVersion}
      </span>
      <a href={update.releaseUrl} target="_blank" rel="noreferrer" className="font-medium underline whitespace-nowrap">
        See what&apos;s new
      </a>
    </div>
  );
}
