import { getProduct, type Product } from "../catalog";
import { renewalPrice } from "../format";
import {
  DAY_MS,
  MAGIC_TTL_MS,
  SESSION_TTL_MS,
  YEAR_MS,
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

interface MagicToken {
  token: string;
  email: string;
  expiresAt: Date;
  consumed: boolean;
}
interface Session {
  token: string;
  userId: string;
  expiresAt: Date;
}
interface Store {
  users: Map<string, AppUser>;
  magicTokens: Map<string, MagicToken>;
  sessions: Map<string, Session>;
  entitlements: AppEntitlement[];
  orders: AppOrder[];
  progress: Map<string, Set<string>>;
  projects: UserProject[];
  processedPayments: Set<string>;
  orderSeq: number;
}

function uid(): string {
  return crypto.randomUUID();
}

function seed(): Store {
  const store: Store = {
    users: new Map(),
    magicTokens: new Map(),
    sessions: new Map(),
    entitlements: [],
    orders: [],
    progress: new Map(),
    projects: [],
    processedPayments: new Set(),
    orderSeq: 2142,
  };

  const asha: AppUser = {
    id: "u_asha",
    email: "asha.menon@gmail.com",
    name: "Asha Menon",
    isAdmin: false,
    slug: "asha-menon",
  };
  const owner: AppUser = {
    id: "u_praveen",
    email: "praveen@aipraveen.com",
    name: "Praveen Dalal",
    isAdmin: true,
    slug: "praveen-dalal",
  };
  store.users.set(asha.id, asha);
  store.users.set(owner.id, owner);

  const now = Date.now();
  store.entitlements.push(
    {
      id: uid(),
      userId: asha.id,
      productId: "flagship",
      purchasedAt: new Date(now - 60 * DAY_MS),
      expiresAt: new Date(now - 60 * DAY_MS + YEAR_MS),
      renewalCount: 0,
    },
    {
      id: uid(),
      userId: asha.id,
      productId: "career",
      purchasedAt: new Date(now - (365 - 21) * DAY_MS),
      expiresAt: new Date(now + 21 * DAY_MS),
      renewalCount: 0,
    },
    {
      id: uid(),
      userId: asha.id,
      productId: "prompt",
      purchasedAt: new Date(now - 400 * DAY_MS),
      expiresAt: new Date(now - 40 * DAY_MS),
      renewalCount: 0,
    },
  );

  store.progress.set("u_asha:flagship", new Set(lessonKeysFor("flagship").slice(0, 6)));

  store.projects.push(
    {
      id: uid(),
      userId: asha.id,
      briefId: "PR-003",
      briefTitle: "Review-to-insight digest",
      title: "ReviewLens — weekly insight digest",
      description:
        "Ingests a week of marketplace reviews and produces a one-page digest: the top three themes, the sentiment trend, and the single most urgent issue, each with a quoted example.",
      audience: "Founders and marketing leads at small D2C brands.",
      techStack: ["Next.js", "GPT-4o mini", "Google Sheets", "Vercel"],
      links: [
        { label: "Live demo", url: "https://example.com/reviewlens" },
        { label: "How it works", url: "https://example.com/reviewlens/notes" },
      ],
      status: "published",
      feedback:
        "Strong build. The theme clustering is genuinely useful. One improvement: quote the review verbatim next to each theme so a manager can trust the summary — right now it paraphrases. Do that and I'd happily show this to a recruiter.",
      reviewedAt: new Date(now - 16 * DAY_MS),
      createdAt: new Date(now - 20 * DAY_MS),
    },
    {
      id: uid(),
      userId: asha.id,
      briefId: "PR-022",
      briefTitle: "WhatsApp order-taker for a tiffin service",
      title: "TiffinDesk — WhatsApp order-taker",
      description:
        "Reads a day of free-text WhatsApp orders, matches them to the menu, and prints a kitchen-ready list plus anything that needs confirming.",
      audience: "Home kitchens and small tiffin services.",
      techStack: ["Python", "Claude", "Streamlit"],
      links: [{ label: "Live demo", url: "https://example.com/tiffindesk" }],
      status: "published",
      feedback: null,
      reviewedAt: null,
      createdAt: new Date(now - 8 * DAY_MS),
    },
    {
      id: uid(),
      userId: asha.id,
      briefId: "PR-031",
      briefTitle: "Resume screener that explains itself",
      title: "FairScreen — explainable resume screening",
      description:
        "Scores resumes against an explicit rubric and writes one honest paragraph for every reject — no silent scores.",
      audience: "Campus placement cells and small hiring teams.",
      techStack: ["Next.js", "OpenAI API"],
      links: [],
      status: "published",
      feedback: null,
      reviewedAt: null,
      createdAt: new Date(now - 3 * DAY_MS),
    },
  );

  return store;
}

// Persist across HMR reloads in dev.
const g = globalThis as unknown as { __aipraveenStore?: Store };
const db: Store = g.__aipraveenStore ?? (g.__aipraveenStore = seed());

function view(e: AppEntitlement): EntitlementView | null {
  const product = getProduct(e.productId);
  if (!product) return null;
  return { ...e, product, status: computeStatus(e.expiresAt) };
}

export const memoryStore: DataStore = {
  async findUserByEmail(email) {
    const e = email.trim().toLowerCase();
    for (const u of db.users.values()) if (u.email === e) return u;
    return null;
  },
  async getUser(id) {
    return db.users.get(id) ?? null;
  },
  async upsertUserByEmail(email) {
    const existing = await this.findUserByEmail(email);
    if (existing) return existing;
    const clean = email.trim().toLowerCase();
    let slug = slugify(clean.split("@")[0]);
    let n = 2;
    while ([...db.users.values()].some((u) => u.slug === slug)) {
      slug = `${slugify(clean.split("@")[0])}-${n++}`;
    }
    const user: AppUser = { id: uid(), email: clean, name: null, isAdmin: false, slug };
    db.users.set(user.id, user);
    return user;
  },
  async getUserBySlug(slug) {
    for (const u of db.users.values()) if (u.slug === slug) return u;
    return null;
  },

  async createMagicToken(email) {
    const token = uid().replace(/-/g, "");
    db.magicTokens.set(token, {
      token,
      email: email.trim().toLowerCase(),
      expiresAt: new Date(Date.now() + MAGIC_TTL_MS),
      consumed: false,
    });
    return token;
  },
  async consumeMagicToken(token) {
    const t = db.magicTokens.get(token);
    if (!t || t.consumed || t.expiresAt.getTime() < Date.now()) return null;
    t.consumed = true;
    return t.email;
  },

  async createSession(userId) {
    const token = uid().replace(/-/g, "") + uid().replace(/-/g, "");
    db.sessions.set(token, { token, userId, expiresAt: new Date(Date.now() + SESSION_TTL_MS) });
    return token;
  },
  async getSessionUser(token) {
    if (!token) return null;
    const s = db.sessions.get(token);
    if (!s || s.expiresAt.getTime() < Date.now()) return null;
    return db.users.get(s.userId) ?? null;
  },
  async deleteSession(token) {
    if (token) db.sessions.delete(token);
  },

  async listEntitlements(userId) {
    return db.entitlements
      .filter((e) => e.userId === userId)
      .map(view)
      .filter((v): v is EntitlementView => v !== null);
  },
  async getEntitlement(userId, productId) {
    const e = db.entitlements.find((x) => x.userId === userId && x.productId === productId);
    return e ? view(e) : null;
  },
  async hasActivePaidCourse(userId) {
    const ents = await this.listEntitlements(userId);
    return ents.some(
      (e) => e.product.kind === "course" && e.product.price > 0 && e.status !== "expired",
    );
  },

  async recordPurchase(userId, email, product, meta) {
    const now = Date.now();
    const order: AppOrder = {
      id: `AP-${db.orderSeq++}`,
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
    db.orders.push(order);
    let ent = db.entitlements.find((e) => e.userId === userId && e.productId === product.id);
    if (ent) {
      ent.expiresAt = new Date(Math.max(ent.expiresAt.getTime(), now) + YEAR_MS);
    } else {
      ent = {
        id: uid(),
        userId,
        productId: product.id,
        purchasedAt: new Date(now),
        expiresAt: new Date(now + YEAR_MS),
        renewalCount: 0,
      };
      db.entitlements.push(ent);
    }
    return { order, entitlement: ent };
  },
  async recordRenewal(userId, email, product, meta) {
    const now = Date.now();
    const ent = db.entitlements.find((e) => e.userId === userId && e.productId === product.id);
    const base = ent ? Math.max(ent.expiresAt.getTime(), now) : now;
    if (ent) {
      ent.expiresAt = new Date(base + YEAR_MS);
      ent.renewalCount += 1;
    }
    const order: AppOrder = {
      id: `AP-${db.orderSeq++}`,
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
    db.orders.push(order);
    return { order, entitlement: ent ?? null };
  },
  async recordCompetitionOrder(userId, email, competitionId, name, fee, meta) {
    const order: AppOrder = {
      id: `AP-${db.orderSeq++}`,
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
    db.orders.push(order);
    return order;
  },
  async claimPayment(paymentId) {
    if (db.processedPayments.has(paymentId)) return false;
    db.processedPayments.add(paymentId);
    return true;
  },
  async revokeByPayment(paymentId) {
    const order = db.orders.find((o) => o.razorpayPaymentId === paymentId);
    if (!order) return { ok: false };
    order.status = "refunded";
    if (order.userId && order.productId) {
      const uid2 = order.userId;
      const pid = order.productId;
      db.entitlements = db.entitlements.filter(
        (e) => !(e.userId === uid2 && e.productId === pid),
      );
    }
    return { ok: true };
  },
  async listOrders(userId) {
    return db.orders
      .filter((o) => o.userId === userId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  },

  async getCompletedLessons(userId, productId) {
    return db.progress.get(`${userId}:${productId}`) ?? new Set();
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
    const key = `${userId}:${productId}`;
    const set = db.progress.get(key) ?? new Set<string>();
    if (completed) set.add(lessonKey);
    else set.delete(lessonKey);
    db.progress.set(key, set);
  },

  async listUserProjects(userId) {
    return db.projects
      .filter((p) => p.userId === userId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  },
  async listPublishedProjects(userId) {
    return (await this.listUserProjects(userId)).filter((p) => p.status === "published");
  },
  async addUserProject(userId, input) {
    const project: UserProject = {
      id: uid(),
      userId,
      briefId: input.briefId,
      briefTitle: input.briefTitle,
      title: input.title,
      description: input.description,
      audience: input.audience,
      techStack: input.techStack,
      links: input.links,
      status: "published",
      feedback: null,
      reviewedAt: null,
      createdAt: new Date(),
    };
    db.projects.push(project);
    return project;
  },
  async listAllProjectsForAdmin() {
    return db.projects
      .map((p) => {
        const u = db.users.get(p.userId);
        return {
          ...p,
          userEmail: u?.email ?? "unknown",
          userName: u ? displayName(u) : "Unknown",
        };
      })
      .sort(adminProjectSort);
  },
  async setProjectFeedback(projectId, feedback) {
    const p = db.projects.find((x) => x.id === projectId);
    if (!p) return { ok: false };
    p.feedback = feedback.trim() || null;
    p.reviewedAt = p.feedback ? new Date() : null;
    return { ok: true };
  },
};

export { seed as seedMemory };
