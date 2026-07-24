import {
  pgTable,
  text,
  serial,
  timestamp,
  integer,
  jsonb,
  real,
  uniqueIndex,
} from "drizzle-orm/pg-core";

export type SubmissionFile = { path: string; name: string };

export const submissionsTable = pgTable("submissions", {
  id: serial("id").primaryKey(),
  assignmentId: integer("assignment_id").notNull(),
  studentId: text("student_id").notNull(),
  // Set for group assignments: the group this shared submission belongs to.
  groupId: integer("group_id"),
  textResponse: text("text_response"),
  linkUrl: text("link_url"),
  files: jsonb("files").$type<SubmissionFile[]>().notNull().default([]),
  videoPath: text("video_path"),
  audioPath: text("audio_path"),
  status: text("status").notNull().default("submitted"), // submitted | graded
  aiScore: real("ai_score"),
  aiFeedback: text("ai_feedback"),
  plagiarismScore: real("plagiarism_score"),
  // AI-use self-declaration: none | assisted | generated (null = not declared)
  aiDeclaration: text("ai_declaration"),
  aiDeclarationNote: text("ai_declaration_note"),
  score: real("score"),
  feedback: text("feedback"),
  submittedAt: timestamp("submitted_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  gradedAt: timestamp("graded_at", { withTimezone: true }),
});

export type Submission = typeof submissionsTable.$inferSelect;

/**
 * Pairwise similarity results between submissions of the same assignment.
 * Stored with submissionAId < submissionBId so each pair appears once.
 */
export const submissionSimilaritiesTable = pgTable("submission_similarities", {
  id: serial("id").primaryKey(),
  assignmentId: integer("assignment_id").notNull(),
  submissionAId: integer("submission_a_id").notNull(),
  submissionBId: integer("submission_b_id").notNull(),
  score: real("score").notNull(), // 0-100
  computedAt: timestamp("computed_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  // Set when a teacher reviewed the pair and dismissed the flag. Preserved
  // across similarity re-runs (matched by submission pair).
  dismissedAt: timestamp("dismissed_at", { withTimezone: true }),
});

export type SubmissionSimilarity =
  typeof submissionSimilaritiesTable.$inferSelect;

/**
 * Per-member grade overrides for a group submission. The group's shared
 * submission still carries the base score/feedback (submissionsTable); a row
 * here lets the teacher give an individual member a different mark and/or note
 * (e.g. to reflect uneven contribution). A null score means "use the group's
 * shared score" — the row may still carry individual feedback.
 */
export const submissionMemberGradesTable = pgTable(
  "submission_member_grades",
  {
    id: serial("id").primaryKey(),
    submissionId: integer("submission_id").notNull(),
    studentId: text("student_id").notNull(),
    score: real("score"), // null = fall back to the group's shared score
    feedback: text("feedback"),
    gradedAt: timestamp("graded_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex("submission_member_grades_sub_student_unique").on(
      t.submissionId,
      t.studentId,
    ),
  ],
);

export type SubmissionMemberGrade =
  typeof submissionMemberGradesTable.$inferSelect;
