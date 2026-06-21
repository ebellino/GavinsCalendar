import { db } from "@/lib/db";

// There's exactly one settings row per self-hosted instance (id is always 1).
// feedToken acts as the secret in the iCal subscription URL — anyone with the
// link can read saved events, so it must stay unguessable, not just unlisted.
export async function getOrCreateFeedToken(): Promise<string> {
  const settings = await db.instanceSettings.upsert({
    where: { id: 1 },
    create: {},
    update: {},
  });
  return settings.feedToken;
}
