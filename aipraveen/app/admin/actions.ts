"use server";

import { requireAdmin } from "@/lib/auth";
import { setProjectFeedback } from "@/lib/data";

/** Attach review feedback to a student's project (admin only). */
export async function sendFeedback(
  projectId: string,
  feedback: string,
): Promise<{ ok: boolean; error?: string }> {
  await requireAdmin();
  if (!feedback.trim()) return { ok: false, error: "Feedback can't be empty." };
  return setProjectFeedback(projectId, feedback);
}
