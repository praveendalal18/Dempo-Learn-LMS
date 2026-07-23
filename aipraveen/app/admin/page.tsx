import type { Metadata } from "next";
import { requireAdmin } from "@/lib/auth";
import { listAllProjectsForAdmin } from "@/lib/data";
import { AdminClient } from "@/components/admin-client";

export const metadata: Metadata = { title: "Admin" };

export default async function AdminPage() {
  await requireAdmin();
  const submissions = await listAllProjectsForAdmin();
  // Dates aren't serialisable across the server/client boundary as Date objects
  // in a clean way for our simple client — pass ISO strings.
  const submissionData = submissions.map((p) => ({
    id: p.id,
    title: p.title,
    briefId: p.briefId,
    briefTitle: p.briefTitle,
    description: p.description,
    userName: p.userName,
    userEmail: p.userEmail,
    techStack: p.techStack,
    links: p.links,
    feedback: p.feedback,
    reviewed: !!p.reviewedAt,
  }));
  return <AdminClient submissions={submissionData} />;
}
