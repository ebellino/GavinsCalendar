import packageJson from "../../package.json";

export type UpdateInfo = {
  currentVersion: string;
  latestVersion: string;
  releaseUrl: string;
};

function parseVersion(version: string): number[] {
  return version.replace(/^v/, "").split(".").map((part) => parseInt(part, 10) || 0);
}

function isNewer(latest: string, current: string): boolean {
  const a = parseVersion(latest);
  const b = parseVersion(current);
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    const diff = (a[i] ?? 0) - (b[i] ?? 0);
    if (diff !== 0) return diff > 0;
  }
  return false;
}

// Checks GitHub Releases for a newer tag than the version this build was built
// from. No auto-install — just an honest "you're behind" signal for the friend
// running this instance, per the self-host distribution model.
export async function checkForUpdate(): Promise<UpdateInfo | null> {
  const repo = process.env.GITHUB_REPO;
  if (!repo) return null;

  try {
    const res = await fetch(`https://api.github.com/repos/${repo}/releases/latest`, {
      headers: { Accept: "application/vnd.github+json" },
      next: { revalidate: 3600 },
    });
    if (!res.ok) return null;

    const release: { tag_name: string; html_url: string } = await res.json();
    const currentVersion = packageJson.version;

    if (!isNewer(release.tag_name, currentVersion)) return null;

    return {
      currentVersion,
      latestVersion: release.tag_name,
      releaseUrl: release.html_url,
    };
  } catch {
    return null;
  }
}
