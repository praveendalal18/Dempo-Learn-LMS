/**
 * Production Postgres schema (Drizzle), targeting Supabase (Mumbai / ap-south-1).
 * These tables mirror the shapes the app persists via lib/store. Until
 * DATABASE_URL is set the app uses the in-memory dev store instead.
 */
import {
  pgTable,
  text,
  timestamp,
  integer,
  boolean,
  uuid,
  jsonb,
  pgEnum,
  primaryKey,
} from "drizzle-orm/pg-core";

export const orderStatus = pgEnum("order_status", [
  "paid",
  "renewal",
  "refunded",
  "free",
  "failed",
]);

export const projectStatus = pgEnum("project_status", ["in_review", "published"]);

export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  email: text("email").notNull().unique(),
  name: text("name"),
  isAdmin: boolean("is_admin").notNull().default(false),
  slug: text("slug").notNull().unique(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

/** Passwordless 15-minute login tokens. */
export const magicTokens = pgTable("magic_tokens", {
  token: text("token").primaryKey(),
  email: text("email").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  consumedAt: timestamp("consumed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const sessions = pgTable("sessions", {
  token: text("token").primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
});

export const orders = pgTable("orders", {
  id: text("id").primaryKey(), // e.g. AP-2141
  userId: uuid("user_id").references(() => users.id),
  email: text("email").notNull(),
  productId: text("product_id"),
  competitionId: text("competition_id"),
  description: text("description").notNull(),
  amount: integer("amount").notNull(), // whole INR
  status: orderStatus("status").notNull(),
  razorpayOrderId: text("razorpay_order_id"),
  razorpayPaymentId: text("razorpay_payment_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const entitlements = pgTable("entitlements", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  productId: text("product_id").notNull(),
  purchasedAt: timestamp("purchased_at", { withTimezone: true }).notNull().defaultNow(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  renewalCount: integer("renewal_count").notNull().default(0),
});

/** Per-lesson completion for a user's course. */
export const lessonProgress = pgTable(
  "lesson_progress",
  {
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    productId: text("product_id").notNull(),
    lessonKey: text("lesson_key").notNull(),
    completed: boolean("completed").notNull().default(false),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.productId, t.lessonKey] })],
);

export const portfolioProjects = pgTable("portfolio_projects", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  briefId: text("brief_id").notNull(),
  briefTitle: text("brief_title").notNull(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  audience: text("audience").notNull().default(""),
  techStack: text("tech_stack").array().notNull(),
  links: jsonb("links").$type<{ label: string; url: string }[]>().notNull(),
  status: projectStatus("status").notNull().default("published"),
  feedback: text("feedback"),
  reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

/** Idempotency ledger: one row per Razorpay payment we've already fulfilled. */
export const processedPayments = pgTable("processed_payments", {
  paymentId: text("payment_id").primaryKey(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type UserRow = typeof users.$inferSelect;
export type OrderRow = typeof orders.$inferSelect;
export type EntitlementRow = typeof entitlements.$inferSelect;
export type ProjectRow = typeof portfolioProjects.$inferSelect;
