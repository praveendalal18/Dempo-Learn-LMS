import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { getProduct } from "@/lib/catalog";
import { requireUser } from "@/lib/auth";
import { getEntitlement } from "@/lib/data";
import { routes } from "@/lib/routes";
import { ViewerClient } from "@/components/viewer-client";

export const metadata: Metadata = { title: "Resources" };

export default async function ResourcesPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ doc?: string }>;
}) {
  const { slug } = await params;
  const { doc } = await searchParams;
  const product = getProduct(slug);
  if (!product) notFound();

  const user = await requireUser(routes.viewer(slug));
  const ent = await getEntitlement(user.id, product.id);
  if (!ent) redirect(routes.product(slug));
  if (ent.status === "expired") redirect(routes.expired(slug));

  return <ViewerClient slug={slug} email={user.email} initialDoc={Number(doc ?? 0)} />;
}
