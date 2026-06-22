"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";

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
