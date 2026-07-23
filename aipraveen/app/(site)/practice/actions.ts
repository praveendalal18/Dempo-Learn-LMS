"use server";

import { requireUser } from "@/lib/auth";
import { addUserProject, type ProjectLink } from "@/lib/data";
import { getPracticeProject } from "@/lib/practice";

export interface SubmitInput {
  briefId: string;
  title: string;
  description: string;
  audience: string;
  techStack: string[];
  links: ProjectLink[];
}

export interface SubmitOutcome {
  ok: boolean;
  error?: string;
  redirect?: string;
}

export async function submitProject(input: SubmitInput): Promise<SubmitOutcome> {
  const user = await requireUser(`/practice/${input.briefId}/submit`);

  const brief = getPracticeProject(input.briefId);
  if (!brief) return { ok: false, error: "That project brief no longer exists." };

  const title = input.title?.trim();
  const description = input.description?.trim();
  if (!title) return { ok: false, error: "Give your project a title." };
  if (!description)
    return { ok: false, error: "Add a short description of what you built." };

  const links = (input.links ?? [])
    .map((l) => ({ label: l.label?.trim() || "Link", url: l.url?.trim() ?? "" }))
    .filter((l) => /^https?:\/\//i.test(l.url));

  const techStack = (input.techStack ?? [])
    .map((t) => t.trim())
    .filter(Boolean)
    .slice(0, 12);

  await addUserProject(user.id, {
    briefId: brief.id,
    briefTitle: brief.title,
    title,
    description,
    audience: input.audience?.trim() ?? "",
    techStack,
    links,
  });

  return { ok: true, redirect: "/portfolio" };
}
