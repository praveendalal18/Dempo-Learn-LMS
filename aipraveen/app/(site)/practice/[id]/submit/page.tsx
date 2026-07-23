import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Container } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { getPracticeProject } from "@/lib/practice";
import { routes } from "@/lib/routes";
import { ProjectSubmitForm } from "@/components/project-submit-form";

export const metadata: Metadata = { title: "Submit your build" };

export default async function SubmitPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const brief = getPracticeProject(id);
  if (!brief) notFound();

  // Creates the profile if needed: sends them to login, then back here.
  await requireUser(routes.practiceSubmit(id));

  return (
    <Container max="form" style={{ padding: "48px 28px 88px" }}>
      <div className="mono" style={{ fontSize: 10.5, letterSpacing: "0.1em", color: "var(--text-secondary)", marginBottom: 18 }}>
        <Link href={routes.practiceProject(id)} className="plain" style={{ color: "var(--accent)" }}>
          ← BACK TO PROBLEM
        </Link>
      </div>
      <h1 className="display" style={{ fontWeight: 650, fontSize: 30, letterSpacing: "-0.02em", margin: "0 0 8px" }}>
        Submit your build
      </h1>
      <p style={{ color: "var(--text-secondary)", fontSize: 14, margin: "0 0 28px" }}>
        Tell recruiters what you made and how. It goes straight onto your shareable portfolio.
      </p>
      <ProjectSubmitForm briefId={brief.id} briefTitle={brief.title} defaultTitle={brief.title} />
    </Container>
  );
}
