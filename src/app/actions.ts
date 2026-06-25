"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { discoverLocalFeeds, type DiscoveryCandidate } from "@/lib/discovery";
import { validateVenueUrl } from "@/lib/sources/venueScraperSource";

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

export async function removeLocalFeed(id: string) {
  await db.localFeedSource.delete({ where: { id } });
  revalidatePath("/");
}

export async function addVenueSource(url: string): Promise<{ id: string; label: string; readable: boolean }> {
  const { label, readable } = await validateVenueUrl(url);
  const record = await db.venueSource.upsert({
    where: { url },
    create: { url, label, readable },
    update: { label, readable },
  });
  revalidatePath("/");
  return { id: record.id, label: record.label, readable: record.readable };
}

export async function removeVenueSource(id: string) {
  await db.venueSource.delete({ where: { id } });
  revalidatePath("/");
}
