import { pgTable, text, serial, integer, timestamp } from "drizzle-orm/pg-core";

// A recorded early-alert nudge: a professor/coordinator/dean flags a student
// (usually from the at-risk list) so they and oversight can follow up.
export const earlyAlertsTable = pgTable("early_alerts", {
  id: serial("id").primaryKey(),
  courseId: integer("course_id").notNull(),
  studentId: text("student_id").notNull(),
  senderId: text("sender_id").notNull(),
  reason: text("reason").notNull(),
  note: text("note"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type EarlyAlert = typeof earlyAlertsTable.$inferSelect;
