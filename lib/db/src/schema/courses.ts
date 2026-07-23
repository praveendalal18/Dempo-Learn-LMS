import { pgTable, text, serial, timestamp, integer, jsonb, uniqueIndex, boolean } from "drizzle-orm/pg-core";

export const coursesTable = pgTable("courses", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description"),
  teacherId: text("teacher_id").notNull(),
  inviteCode: text("invite_code").notNull().unique(),
  // Set to false when the owning teacher's access is removed; inactive
  // courses are hidden from students.
  isActive: boolean("is_active").notNull().default(true),
  planHours: integer("plan_hours").notNull().default(0),
  // Teaching hours grouped into one "day"/session block. Default 1 = each hour
  // is its own dated session (the standard model); higher values group hours
  // into multi-hour "days" (legacy).
  planHoursPerDay: integer("plan_hours_per_day").notNull().default(1),
  // Default start time (HH:MM, 24h) and length for a session, used when a
  // specific day has no time override.
  planStartTime: text("plan_start_time").notNull().default("09:00"),
  planSessionMinutes: integer("plan_session_minutes").notNull().default(60),
  lockedPlanDays: jsonb("locked_plan_days")
    .notNull()
    .default([])
    .$type<number[]>(),
  // Optional calendar date (YYYY-MM-DD) per plan day, keyed by day number.
  planDayDates: jsonb("plan_day_dates").$type<Record<string, string>>(),
  // Optional per-day start-time override (HH:MM), keyed by day number.
  planDayTimes: jsonb("plan_day_times").$type<Record<string, string>>(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const coursePlanItemsTable = pgTable("course_plan_items", {
  id: serial("id").primaryKey(),
  courseId: integer("course_id").notNull(),
  hourNumber: integer("hour_number").notNull(),
  title: text("title").notNull(),
  description: text("description"),
  preWork: text("pre_work"),
  caseStudy: text("case_study"),
  postWork: text("post_work"),
});

// Per-hour links + attachments for the plan. Kept separate from
// course_plan_items (which the plan PUT delete-and-replaces) and keyed by
// (courseId, hourNumber) so it survives plan text edits.
export const coursePlanExtrasTable = pgTable(
  "course_plan_extras",
  {
    id: serial("id").primaryKey(),
    courseId: integer("course_id").notNull(),
    hourNumber: integer("hour_number").notNull(),
    links: jsonb("links").notNull().default([]).$type<string[]>(),
    attachments: jsonb("attachments")
      .notNull()
      .default([])
      .$type<{ path: string; name: string; size?: number }[]>(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [uniqueIndex("course_plan_extras_course_hour_idx").on(t.courseId, t.hourNumber)],
);

export const enrollmentsTable = pgTable("enrollments", {
  id: serial("id").primaryKey(),
  courseId: integer("course_id").notNull(),
  studentId: text("student_id").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const invitesTable = pgTable("invites", {
  id: serial("id").primaryKey(),
  courseId: integer("course_id").notNull(),
  email: text("email").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const courseMaterialsTable = pgTable("course_materials", {
  id: serial("id").primaryKey(),
  courseId: integer("course_id").notNull(),
  authorId: text("author_id").notNull(),
  title: text("title").notNull(),
  body: text("body"),
  links: jsonb("links").notNull().default([]).$type<string[]>(),
  attachments: jsonb("attachments")
    .notNull()
    .default([])
    .$type<{ path: string; name: string; size?: number }[]>(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const courseMaterialReadsTable = pgTable(
  "course_material_reads",
  {
    id: serial("id").primaryKey(),
    courseId: integer("course_id").notNull(),
    userId: text("user_id").notNull(),
    lastSeenAt: timestamp("last_seen_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [uniqueIndex("course_material_reads_course_user_idx").on(t.courseId, t.userId)],
);

export type Course = typeof coursesTable.$inferSelect;
export type CourseMaterialRead = typeof courseMaterialReadsTable.$inferSelect;
export type CourseMaterial = typeof courseMaterialsTable.$inferSelect;
export type Enrollment = typeof enrollmentsTable.$inferSelect;
export type Invite = typeof invitesTable.$inferSelect;
export type CoursePlanItem = typeof coursePlanItemsTable.$inferSelect;
export type CoursePlanExtra = typeof coursePlanExtrasTable.$inferSelect;
