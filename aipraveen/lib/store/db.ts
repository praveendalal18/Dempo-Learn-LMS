import { and, desc, eq, gt, isNull } from "drizzle-orm";
import type { PgDatabase } from "drizzle-orm/pg-core";
import { getProduct, type Product } from "../catalog";
import { renewalPrice } from "../format";
import * as schema from "../db/schema";
import {
  YEAR_MS,
  MAGIC_TTL_MS,
  SESSION_TTL_MS,
  adminProjectSort,
  computeStatus,
  displayName,
  lessonKeysFor,
  slugify,
} from "./helpers";
import type {
  AppEntitlement,
  AppOrder,
  AppUser,
  DataStore,
  EntitlementView,
  UserProject,
} from "./types";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Db = PgDatabase<any, typeof schema, any>;

const {
  users,
  magicTokens,
  sessions,
  orders,
  entitlements,
  lessonProgress,
  portfolioProjects,
  processedPayments,
} = schema;

function uid(): string {
  return crypto.randomUUID();
}
function orderId(): string {
  return `AP-${crypto.randomUUID().replace(/-/g, "").slice(0, 8).toUpperCase()}`;
}
function token(): string {
  return crypto.randomUUID().replace(/-/g, "") + crypto.randomUUID().replace(/-/g, "");
}

function mapUser(r: schema.UserRow): AppUser {
  return { id: r.id, email: r.email, name: r.name, isAdmin: r.isAdmin, slug: r.slug };
}
function mapOrder(r: schema.OrderRow): AppOrder {
  return {
    id: r.id,
    userId: r.userId,
    email: r.email,
    productId: r.productId ?? undefined,
    competitionId: r.competitionId ?? undefined,
    description: r.description,
    amount: r.amount,
    status: r.status,
    razorpayOrderId: r.razorpayOrderId ?? undefined,
    razorpayPaymentId: r.razorpayPaymentId ?? undefined,
    createdAt: r.createdAt,
  };
}
function mapEntitlement(r: schema.EntitlementRow): AppEntitlement {
  return {
    id: r.id,
    userId: r.userId,
    productId: r.productId,
    purchasedAt: r.purchasedAt,
    expiresAt: r.expiresAt,
    renewalCount: r.renewalCount,
  };
}
function mapProject(r: schema.ProjectRow): UserProject {
  return {
    id: r.id,
    userId: r.userId,
    briefId: r.briefId,
    briefTitle: r.briefTitle,
    title: r.title,
    description: r.description,
    audience: r.audience,
    techStack: r.techStack,
    links: r.links,
    status: r.status,
    feedback: r.feedback,
    reviewedAt: r.reviewedAt,
    createdAt: r.createdAt,
  };
}
function toView(e: AppEntitlement): EntitlementView | null {
  const product = getProduct(e.productId);
  if (!product) return null;
  return { ...e, product, status: computeStatus(e.expiresAt) };
}

/** Drizzle/Postgres implementation of the data store. */
export function makeDbStore(db: Db): DataStore {
  async function findByEmail(email: string): Promise<AppUser | null> {
    const rows = await db
      .select()
      .from(users)
      .where(eq(users.email, email.trim().toLowerCase()))
      .limit(1);
    return rows[0] ? mapUser(rows[0]) : null;
  }

  return {
    findUserByEmail: findByEmail,

    async getUser(id) {
      const rows = await db.select().from(users).where(eq(users.id, id)).limit(1);
      return rows[0] ? mapUser(rows[0]) : null;
    },

    async upsertUserByEmail(email) {
      const clean = email.trim().toLowerCase();
      const existing = await findByEmail(clean);
      if (existing) return existing;
      const base = slugify(clean.split("@")[0]);
      let slug = base;
      let n = 2;
      // Find a free slug.
      // eslint-disable-next-line no-constant-condition
      while (true) {
        const taken = await db.select({ id: users.id }).from(users).where(eq(users.slug, slug)).limit(1);
        if (!taken[0]) break;
        slug = `${base}-${n++}`;
      }
      const [row] = await db
        .insert(users)
        .values({ email: clean, name: null, isAdmin: false, slug })
        .returning();
      return mapUser(row);
    },

    async getUserBySlug(slug) {
      const rows = await db.select().from(users).where(eq(users.slug, slug)).limit(1);
      return rows[0] ? mapUser(rows[0]) : null;
    },

    async createMagicToken(email) {
      const t = crypto.randomUUID().replace(/-/g, "");
      await db.insert(magicTokens).values({
        token: t,
        email: email.trim().toLowerCase(),
        expiresAt: new Date(Date.now() + MAGIC_TTL_MS),
      });
      return t;
    },

    async consumeMagicToken(t) {
      const rows = await db
        .update(magicTokens)
        .set({ consumedAt: new Date() })
        .where(
          and(
            eq(magicTokens.token, t),
            isNull(magicTokens.consumedAt),
            gt(magicTokens.expiresAt, new Date()),
          ),
        )
        .returning({ email: magicTokens.email });
      return rows[0]?.email ?? null;
    },

    async createSession(userId) {
      const t = token();
      await db.insert(sessions).values({
        token: t,
        userId,
        expiresAt: new Date(Date.now() + SESSION_TTL_MS),
      });
      return t;
    },

    async getSessionUser(t) {
      if (!t) return null;
      const rows = await db.select().from(sessions).where(eq(sessions.token, t)).limit(1);
      const s = rows[0];
      if (!s || s.expiresAt.getTime() < Date.now()) return null;
      const urows = await db.select().from(users).where(eq(users.id, s.userId)).limit(1);
      return urows[0] ? mapUser(urows[0]) : null;
    },

    async deleteSession(t) {
      if (t) await db.delete(sessions).where(eq(sessions.token, t));
    },

    async listEntitlements(userId) {
      const rows = await db.select().from(entitlements).where(eq(entitlements.userId, userId));
      return rows
        .map(mapEntitlement)
        .map(toView)
        .filter((v): v is EntitlementView => v !== null);
    },

    async getEntitlement(userId, productId) {
      const rows = await db
        .select()
        .from(entitlements)
        .where(and(eq(entitlements.userId, userId), eq(entitlements.productId, productId)))
        .limit(1);
      return rows[0] ? toView(mapEntitlement(rows[0])) : null;
    },

    async hasActivePaidCourse(userId) {
      const ents = await this.listEntitlements(userId);
      return ents.some(
        (e) => e.product.kind === "course" && e.product.price > 0 && e.status !== "expired",
      );
    },

    async recordPurchase(userId, email, product: Product, meta) {
      const now = Date.now();
      const order: AppOrder = {
        id: orderId(),
        userId,
        email,
        productId: product.id,
        description: product.title,
        amount: product.price,
        status: product.price === 0 ? "free" : "paid",
        razorpayOrderId: meta?.razorpayOrderId,
        razorpayPaymentId: meta?.razorpayPaymentId,
        createdAt: new Date(now),
      };
      await db.insert(orders).values({
        id: order.id,
        userId,
        email,
        productId: product.id,
        description: order.description,
        amount: order.amount,
        status: order.status,
        razorpayOrderId: meta?.razorpayOrderId,
        razorpayPaymentId: meta?.razorpayPaymentId,
      });

      const existing = await db
        .select()
        .from(entitlements)
        .where(and(eq(entitlements.userId, userId), eq(entitlements.productId, product.id)))
        .limit(1);
      let ent: AppEntitlement;
      if (existing[0]) {
        const expiresAt = new Date(Math.max(existing[0].expiresAt.getTime(), now) + YEAR_MS);
        await db.update(entitlements).set({ expiresAt }).where(eq(entitlements.id, existing[0].id));
        ent = { ...mapEntitlement(existing[0]), expiresAt };
      } else {
        const [row] = await db
          .insert(entitlements)
          .values({
            userId,
            productId: product.id,
            purchasedAt: new Date(now),
            expiresAt: new Date(now + YEAR_MS),
            renewalCount: 0,
          })
          .returning();
        ent = mapEntitlement(row);
      }
      return { order, entitlement: ent };
    },

    async recordRenewal(userId, email, product: Product, meta) {
      const now = Date.now();
      const existing = await db
        .select()
        .from(entitlements)
        .where(and(eq(entitlements.userId, userId), eq(entitlements.productId, product.id)))
        .limit(1);
      let ent: AppEntitlement | null = null;
      if (existing[0]) {
        const expiresAt = new Date(Math.max(existing[0].expiresAt.getTime(), now) + YEAR_MS);
        const renewalCount = existing[0].renewalCount + 1;
        await db
          .update(entitlements)
          .set({ expiresAt, renewalCount })
          .where(eq(entitlements.id, existing[0].id));
        ent = { ...mapEntitlement(existing[0]), expiresAt, renewalCount };
      }
      const order: AppOrder = {
        id: orderId(),
        userId,
        email,
        productId: product.id,
        description: `${product.title} · renewal`,
        amount: renewalPrice(product.price, product.renewPercent),
        status: "renewal",
        razorpayOrderId: meta?.razorpayOrderId,
        razorpayPaymentId: meta?.razorpayPaymentId,
        createdAt: new Date(now),
      };
      await db.insert(orders).values({
        id: order.id,
        userId,
        email,
        productId: product.id,
        description: order.description,
        amount: order.amount,
        status: "renewal",
        razorpayOrderId: meta?.razorpayOrderId,
        razorpayPaymentId: meta?.razorpayPaymentId,
      });
      return { order, entitlement: ent };
    },

    async recordCompetitionOrder(userId, email, competitionId, name, fee, meta) {
      const order: AppOrder = {
        id: orderId(),
        userId,
        email,
        competitionId,
        description: `Competition entry — ${name}`,
        amount: fee,
        status: "paid",
        razorpayOrderId: meta?.razorpayOrderId,
        razorpayPaymentId: meta?.razorpayPaymentId,
        createdAt: new Date(),
      };
      await db.insert(orders).values({
        id: order.id,
        userId,
        email,
        competitionId,
        description: order.description,
        amount: fee,
        status: "paid",
        razorpayOrderId: meta?.razorpayOrderId,
        razorpayPaymentId: meta?.razorpayPaymentId,
      });
      return order;
    },

    async claimPayment(paymentId) {
      const rows = await db
        .insert(processedPayments)
        .values({ paymentId })
        .onConflictDoNothing()
        .returning({ paymentId: processedPayments.paymentId });
      return rows.length > 0;
    },

    async revokeByPayment(paymentId) {
      const rows = await db
        .select()
        .from(orders)
        .where(eq(orders.razorpayPaymentId, paymentId))
        .limit(1);
      const order = rows[0];
      if (!order) return { ok: false };
      await db.update(orders).set({ status: "refunded" }).where(eq(orders.id, order.id));
      if (order.userId && order.productId) {
        await db
          .delete(entitlements)
          .where(
            and(
              eq(entitlements.userId, order.userId),
              eq(entitlements.productId, order.productId),
            ),
          );
      }
      return { ok: true };
    },

    async listOrders(userId) {
      const rows = await db
        .select()
        .from(orders)
        .where(eq(orders.userId, userId))
        .orderBy(desc(orders.createdAt));
      return rows.map(mapOrder);
    },

    async getCompletedLessons(userId, productId) {
      const rows = await db
        .select({ lessonKey: lessonProgress.lessonKey })
        .from(lessonProgress)
        .where(
          and(
            eq(lessonProgress.userId, userId),
            eq(lessonProgress.productId, productId),
            eq(lessonProgress.completed, true),
          ),
        );
      return new Set(rows.map((r) => r.lessonKey));
    },

    async courseProgress(userId, productId) {
      const keys = lessonKeysFor(productId);
      const done = await this.getCompletedLessons(userId, productId);
      const completed = keys.filter((k) => done.has(k)).length;
      const total = keys.length;
      const nextIdx = keys.findIndex((k) => !done.has(k));
      return {
        completed,
        total,
        percent: total ? Math.round((completed / total) * 100) : 0,
        nextLessonIndex: nextIdx < 0 ? Math.max(0, total - 1) : nextIdx,
      };
    },

    async setLessonCompleted(userId, productId, lessonKey, completed) {
      await db
        .insert(lessonProgress)
        .values({ userId, productId, lessonKey, completed, updatedAt: new Date() })
        .onConflictDoUpdate({
          target: [lessonProgress.userId, lessonProgress.productId, lessonProgress.lessonKey],
          set: { completed, updatedAt: new Date() },
        });
    },

    async listUserProjects(userId) {
      const rows = await db
        .select()
        .from(portfolioProjects)
        .where(eq(portfolioProjects.userId, userId))
        .orderBy(desc(portfolioProjects.createdAt));
      return rows.map(mapProject);
    },

    async listPublishedProjects(userId) {
      return (await this.listUserProjects(userId)).filter((p) => p.status === "published");
    },

    async addUserProject(userId, input) {
      const [row] = await db
        .insert(portfolioProjects)
        .values({
          userId,
          briefId: input.briefId,
          briefTitle: input.briefTitle,
          title: input.title,
          description: input.description,
          audience: input.audience,
          techStack: input.techStack,
          links: input.links,
          status: "published",
        })
        .returning();
      return mapProject(row);
    },

    async listAllProjectsForAdmin() {
      const rows = await db
        .select({ project: portfolioProjects, email: users.email, name: users.name })
        .from(portfolioProjects)
        .leftJoin(users, eq(portfolioProjects.userId, users.id));
      return rows
        .map((r) => ({
          ...mapProject(r.project),
          userEmail: r.email ?? "unknown",
          userName: r.email ? displayName({ name: r.name, email: r.email }) : "Unknown",
        }))
        .sort(adminProjectSort);
    },

    async setProjectFeedback(projectId, feedback) {
      const clean = feedback.trim();
      const rows = await db
        .update(portfolioProjects)
        .set({ feedback: clean || null, reviewedAt: clean ? new Date() : null })
        .where(eq(portfolioProjects.id, projectId))
        .returning({ id: portfolioProjects.id });
      return { ok: rows.length > 0 };
    },
  };
}
