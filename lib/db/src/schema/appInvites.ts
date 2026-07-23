import { pgTable, serial, text, timestamp, jsonb } from "drizzle-orm/pg-core";

// Access allow-list: only emails an admin has invited (or ADMIN_EMAILS) may use
// the app. On first sign-in, a matching invite provisions the user with its
// role and is marked accepted. No matching invite -> access denied.
export const appInvitesTable = pgTable("app_invites", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(), // stored lowercased
  name: text("name"),
  role: text("role").notNull().default("student"), // student | teacher
  cohortIds: jsonb("cohort_ids").$type<number[]>(), // optional: auto-add to these cohorts on join
  token: text("token").notNull().unique(), // for the invite link
  invitedBy: text("invited_by").notNull(), // admin user id
  invitedByEmail: text("invited_by_email"),
  acceptedAt: timestamp("accepted_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type AppInvite = typeof appInvitesTable.$inferSelect;
