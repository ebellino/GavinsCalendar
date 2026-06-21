"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";

export async function saveEvent(eventId: string) {
  await db.savedEvent.upsert({
    where: { eventId },
    create: { eventId },
    update: {},
  });
  revalidatePath("/");
}

export async function unsaveEvent(eventId: string) {
  await db.savedEvent.deleteMany({ where: { eventId } });
  revalidatePath("/");
}
