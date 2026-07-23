"use server";

import { requireUser } from "@/lib/auth";
import { getEntitlement, setLessonCompleted } from "@/lib/data";

/** Persist a lesson's completion state for the current user. */
export async function setLesson(
  productId: string,
  lessonKey: string,
  completed: boolean,
): Promise<{ ok: boolean }> {
  const user = await requireUser();
  const ent = await getEntitlement(user.id, productId);
  if (!ent || ent.status === "expired") return { ok: false };
  await setLessonCompleted(user.id, productId, lessonKey, completed);
  return { ok: true };
}
