import { pgTable, text, serial, integer, timestamp, uniqueIndex } from "drizzle-orm/pg-core";

// Feedback notes written by a dean to a professor or course coordinator.
export const feedbackNotesTable = pgTable("feedback_notes", {
  id: serial("id").primaryKey(),
  senderId: text("sender_id").notNull(),
  recipientId: text("recipient_id").notNull(),
  subject: text("subject"),
  body: text("body").notNull(),
  readAt: timestamp("read_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type FeedbackNote = typeof feedbackNotesTable.$inferSelect;
export type InsertFeedbackNote = typeof feedbackNotesTable.$inferInsert;

// Student feedback on a course. One editable row per (course, student).
// overallRating + aspect ratings are 1-5; comment is free text. Identity is
// stored (studentId) but hidden from the professor in the API layer.
export const courseFeedbackTable = pgTable(
  "course_feedback",
  {
    id: serial("id").primaryKey(),
    courseId: integer("course_id").notNull(),
    studentId: text("student_id").notNull(),
    overallRating: integer("overall_rating").notNull(),
    contentRating: integer("content_rating"),
    teachingRating: integer("teaching_rating"),
    workloadRating: integer("workload_rating"),
    comment: text("comment"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [uniqueIndex("course_feedback_course_student_idx").on(t.courseId, t.studentId)],
);

export type CourseFeedback = typeof courseFeedbackTable.$inferSelect;
