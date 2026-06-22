"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { discoverLocalFeeds, type DiscoveryCandidate } from "@/lib/discovery";

export async function saveEvent(formData: FormData) {
  const eventId = formData.get("eventId") as string;
  await db.savedEvent.upsert({
    where: { eventId },
    create: { eventId },
    update: {},
  });
  revalidatePath("/");
}

export async function unsaveEvent(formData: FormData) {
  const eventId = formData.get("eventId") as string;
  await db.savedEvent.deleteMany({ where: { eventId } });
  revalidatePath("/");
}

export async function discoverFeedsForCity(city: string): Promise<DiscoveryCandidate[]> {
  return discoverLocalFeeds(city);
}

export async function approveLocalFeed(city: string, candidate: DiscoveryCandidate) {
  await db.localFeedSource.upsert({
    where: { url: candidate.url },
    create: { city, url: candidate.url, label: candidate.label },
    update: { city, label: candidate.label },
  });
  revalidatePath("/");
}
