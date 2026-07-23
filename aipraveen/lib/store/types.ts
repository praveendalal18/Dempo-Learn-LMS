import type { Product } from "../catalog";

export type EntitlementStatus = "active" | "expiring" | "expired";
export type OrderStatus = "paid" | "renewal" | "refunded" | "free" | "failed";
export type ProjectStatus = "in_review" | "published";

export interface AppUser {
  id: string;
  email: string;
  name: string | null;
  isAdmin: boolean;
  /** Public portfolio slug, e.g. "asha-menon". */
  slug: string;
}

export interface ProjectLink {
  label: string;
  url: string;
}

/** A build a learner submitted against a practice brief — their portfolio work. */
export interface UserProject {
  id: string;
  userId: string;
  briefId: string;
  briefTitle: string;
  title: string;
  description: string;
  audience: string;
  techStack: string[];
  links: ProjectLink[];
  status: ProjectStatus;
  /** Feedback from Praveen after review; null until reviewed. */
  feedback: string | null;
  reviewedAt: Date | null;
  createdAt: Date;
}

export interface AppEntitlement {
  id: string;
  userId: string;
  productId: string;
  purchasedAt: Date;
  expiresAt: Date;
  renewalCount: number;
}

export interface AppOrder {
  id: string;
  userId: string | null;
  email: string;
  productId?: string;
  competitionId?: string;
  description: string;
  amount: number;
  status: OrderStatus;
  razorpayOrderId?: string;
  razorpayPaymentId?: string;
  createdAt: Date;
}

/** Razorpay identifiers to persist on an order (for reconciliation/refunds). */
export interface OrderMeta {
  razorpayOrderId?: string;
  razorpayPaymentId?: string;
}

export interface EntitlementView extends AppEntitlement {
  product: Product;
  status: EntitlementStatus;
}

export interface CourseProgress {
  completed: number;
  total: number;
  percent: number;
  /** Index of the first incomplete lesson (clamped to last if all done). */
  nextLessonIndex: number;
}

export interface PurchaseResult {
  order: AppOrder;
  entitlement: AppEntitlement | null;
}

export interface SubmitProjectInput {
  briefId: string;
  briefTitle: string;
  title: string;
  description: string;
  audience: string;
  techStack: string[];
  links: ProjectLink[];
}

export interface AdminProjectView extends UserProject {
  userEmail: string;
  userName: string;
}

/**
 * The full data-access surface. The app only ever calls these; there are two
 * implementations — in-memory (dev) and Drizzle/Postgres (prod) — behind it.
 */
export interface DataStore {
  findUserByEmail(email: string): Promise<AppUser | null>;
  getUser(id: string): Promise<AppUser | null>;
  upsertUserByEmail(email: string): Promise<AppUser>;
  getUserBySlug(slug: string): Promise<AppUser | null>;

  createMagicToken(email: string): Promise<string>;
  consumeMagicToken(token: string): Promise<string | null>;

  createSession(userId: string): Promise<string>;
  getSessionUser(token: string | undefined): Promise<AppUser | null>;
  deleteSession(token: string | undefined): Promise<void>;

  listEntitlements(userId: string): Promise<EntitlementView[]>;
  getEntitlement(userId: string, productId: string): Promise<EntitlementView | null>;
  hasActivePaidCourse(userId: string): Promise<boolean>;

  recordPurchase(
    userId: string,
    email: string,
    product: Product,
    meta?: OrderMeta,
  ): Promise<PurchaseResult>;
  recordRenewal(
    userId: string,
    email: string,
    product: Product,
    meta?: OrderMeta,
  ): Promise<PurchaseResult>;
  recordCompetitionOrder(
    userId: string,
    email: string,
    competitionId: string,
    name: string,
    fee: number,
    meta?: OrderMeta,
  ): Promise<AppOrder>;
  listOrders(userId: string): Promise<AppOrder[]>;

  /** Idempotency gate: true the first time a Razorpay payment id is seen. */
  claimPayment(razorpayPaymentId: string): Promise<boolean>;
  /** Refund: mark the order refunded and revoke the granted entitlement. */
  revokeByPayment(razorpayPaymentId: string): Promise<{ ok: boolean }>;

  getCompletedLessons(userId: string, productId: string): Promise<Set<string>>;
  courseProgress(userId: string, productId: string): Promise<CourseProgress>;
  setLessonCompleted(
    userId: string,
    productId: string,
    lessonKey: string,
    completed: boolean,
  ): Promise<void>;

  listUserProjects(userId: string): Promise<UserProject[]>;
  listPublishedProjects(userId: string): Promise<UserProject[]>;
  addUserProject(userId: string, input: SubmitProjectInput): Promise<UserProject>;
  listAllProjectsForAdmin(): Promise<AdminProjectView[]>;
  setProjectFeedback(projectId: string, feedback: string): Promise<{ ok: boolean }>;
}
