import {
  pgTable,
  text,
  serial,
  timestamp,
  integer,
  uniqueIndex,
} from "drizzle-orm/pg-core";

export const classSessionsTable = pgTable("class_sessions", {
  id: serial("id").primaryKey(),
  courseId: integer("course_id").notNull(),
  title: text("title").notNull(),
  startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
  endsAt: timestamp("ends_at", { withTimezone: true }),
  // Free-form: a physical location or a meeting URL.
  location: text("location"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type ClassSession = typeof classSessionsTable.$inferSelect;

// Attendance: one row per (session, student). status = present|absent|late|excused.
export const attendanceTable = pgTable(
  "attendance",
  {
    id: serial("id").primaryKey(),
    sessionId: integer("session_id").notNull(),
    courseId: integer("course_id").notNull(),
    studentId: text("student_id").notNull(),
    status: text("status").notNull().default("present"),
    markedBy: text("marked_by"),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [uniqueIndex("attendance_session_student_idx").on(t.sessionId, t.studentId)],
);

export type Attendance = typeof attendanceTable.$inferSelect;
