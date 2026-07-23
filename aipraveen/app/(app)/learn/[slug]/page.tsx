import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { getProduct } from "@/lib/catalog";
import { requireUser } from "@/lib/auth";
import { getEntitlement, courseProgress, getCompletedLessons } from "@/lib/data";
import { formatDate } from "@/lib/format";
import { routes } from "@/lib/routes";
import { PlayerClient } from "@/components/player-client";

export const metadata: Metadata = { title: "Course player" };

export default async function LearnPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const product = getProduct(slug);
  if (!product || product.kind !== "course") notFound();

  const user = await requireUser(routes.learn(slug));
  const ent = await getEntitlement(user.id, product.id);
  if (!ent) redirect(routes.product(slug));
  if (ent.status === "expired") redirect(routes.expired(slug));

  const progress = await courseProgress(user.id, product.id);
  const completed = await getCompletedLessons(user.id, product.id);

  return (
    <PlayerClient
      productId={product.id}
      slug={product.slug}
      title={product.title}
      accessUntil={formatDate(ent.expiresAt)}
      initialCompleted={Array.from(completed)}
      initialLesson={progress.nextLessonIndex}
    />
  );
}
