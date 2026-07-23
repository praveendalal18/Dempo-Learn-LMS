/**
 * Verifies the Drizzle store (lib/store/db.ts) end-to-end against a real
 * Postgres — PGlite (in-process) — without needing Supabase. Applies the
 * generated migration, then runs the full data flow and asserts.
 *
 *   corepack pnpm exec tsx scripts/verify-db.ts
 */
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import * as schema from "../lib/db/schema";
import { makeDbStore } from "../lib/store/db";
import { getProduct } from "../lib/catalog";

let passed = 0;
function assert(cond: unknown, msg: string) {
  if (!cond) {
    console.error("  ✗ FAIL:", msg);
    process.exit(1);
  }
  passed++;
  console.log("  ✓", msg);
}

async function main() {
  const client = new PGlite();
  const dir = join(process.cwd(), "drizzle");
  const ddl = readdirSync(dir)
    .filter((f) => f.endsWith(".sql"))
    .sort()
    .map((f) => readFileSync(join(dir, f), "utf8"))
    .join("\n")
    .replace(/-->\s*statement-breakpoint/g, "");
  await client.exec(ddl);
  console.log("schema applied\n");

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = drizzle(client, { schema }) as any;
  const store = makeDbStore(db);

  console.log("users + auth");
  const user = await store.upsertUserByEmail("Riya.Test@Example.com");
  assert(user.email === "riya.test@example.com", "email normalised to lowercase");
  assert(user.slug === "riya-test", "slug derived from email");
  assert((await store.upsertUserByEmail("riya.test@example.com")).id === user.id, "upsert is idempotent");
  assert((await store.getUserBySlug("riya-test"))?.id === user.id, "lookup by slug");

  const tok = await store.createMagicToken("riya.test@example.com");
  assert((await store.consumeMagicToken(tok)) === "riya.test@example.com", "magic token consumes once");
  assert((await store.consumeMagicToken(tok)) === null, "magic token cannot be reused");

  const sess = await store.createSession(user.id);
  assert((await store.getSessionUser(sess))?.id === user.id, "session resolves to user");
  await store.deleteSession(sess);
  assert((await store.getSessionUser(sess)) === null, "deleted session is gone");

  console.log("\npurchases + entitlements");
  const studio = getProduct("studio-course")!;
  const { order, entitlement } = await store.recordPurchase(user.id, user.email, studio);
  assert(order.status === "paid" && order.amount === 4999, "paid order for 4999");
  assert(entitlement?.productId === "flagship", "entitlement created");
  const ent = await store.getEntitlement(user.id, "flagship");
  assert(ent?.status === "active", "entitlement is active");
  assert((await store.hasActivePaidCourse(user.id)) === true, "hasActivePaidCourse true");
  const before = ent!.expiresAt.getTime();
  await store.recordPurchase(user.id, user.email, studio);
  assert((await store.getEntitlement(user.id, "flagship"))!.expiresAt.getTime() > before, "repeat purchase extends expiry");

  console.log("\nlesson progress");
  await store.setLessonCompleted(user.id, "flagship", "0", true);
  await store.setLessonCompleted(user.id, "flagship", "1", true);
  assert((await store.courseProgress(user.id, "flagship")).completed === 2, "2 lessons complete");
  await store.setLessonCompleted(user.id, "flagship", "0", false);
  assert((await store.courseProgress(user.id, "flagship")).completed === 1, "un-completing a lesson works");

  console.log("\nportfolio + review");
  const proj = await store.addUserProject(user.id, {
    briefId: "PR-003",
    briefTitle: "Review-to-insight digest",
    title: "My build",
    description: "what it does",
    audience: "founders",
    techStack: ["Next.js", "Claude"],
    links: [{ label: "Demo", url: "https://example.com" }],
  });
  assert(proj.status === "published" && proj.feedback === null, "project self-publishes, no feedback yet");
  const pub = await store.listPublishedProjects(user.id);
  assert(pub.length === 1 && pub[0].techStack.length === 2, "techStack[] persisted");
  assert(pub[0].links[0]?.url === "https://example.com", "links jsonb persisted");
  const adminList = await store.listAllProjectsForAdmin();
  assert(adminList[0]?.userEmail === "riya.test@example.com", "admin queue shows author");
  assert((await store.setProjectFeedback(proj.id, "Great — add tests.")).ok, "feedback saved");
  const reviewed = (await store.listUserProjects(user.id))[0];
  assert(reviewed.feedback === "Great — add tests." && reviewed.reviewedAt !== null, "feedback + reviewedAt persisted");

  console.log("\nrenewal + orders");
  const prompt = getProduct("prompt-to-product")!;
  await store.recordPurchase(user.id, user.email, prompt);
  assert((await store.recordRenewal(user.id, user.email, prompt)).order.status === "renewal", "renewal order recorded");
  assert((await store.getEntitlement(user.id, "prompt"))!.renewalCount === 1, "renewalCount incremented");
  assert((await store.listOrders(user.id)).length >= 3, "orders listed newest-first");

  console.log("\nwebhook idempotency + refund");
  assert((await store.claimPayment("pay_ABC")) === true, "first claim of a payment id succeeds");
  assert((await store.claimPayment("pay_ABC")) === false, "second claim of same payment id is blocked");
  // A payment we can later refund.
  const career = getProduct("student-ai-career-kit")!;
  await store.recordPurchase(user.id, user.email, career, { razorpayPaymentId: "pay_REF" });
  assert((await store.getEntitlement(user.id, "career")) !== null, "entitlement exists before refund");
  assert((await store.revokeByPayment("pay_REF")).ok === true, "revoke by payment id succeeds");
  assert((await store.getEntitlement(user.id, "career")) === null, "entitlement revoked after refund");
  assert((await store.revokeByPayment("pay_UNKNOWN")).ok === false, "revoke of unknown payment is a no-op");

  console.log(`\nALL ${passed} DB STORE CHECKS PASSED ✅`);
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
