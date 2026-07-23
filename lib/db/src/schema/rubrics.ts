import { pgTable, serial, integer, jsonb, timestamp, uniqueIndex } from "drizzle-orm/pg-core";

export type RubricCriterion = { name: string; description?: string; maxPoints: number };
export type RubricScore = { name: string; points: number };

// Points-based rubric attached to an assignment; criteria maxPoints should sum
// to the assignment's maxScore (validated softly in the UI).
export const assignmentRubricsTable = pgTable(
  "assignment_rubrics",
  {
    id: serial("id").primaryKey(),
    assignmentId: integer("assignment_id").notNull(),
    criteria: jsonb("criteria").notNull().default([]).$type<RubricCriterion[]>(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("assignment_rubric_idx").on(t.assignmentId)],
);

// Per-criterion marks a teacher assigned when grading a submission.
export const submissionRubricScoresTable = pgTable(
  "submission_rubric_scores",
  {
    id: serial("id").primaryKey(),
    submissionId: integer("submission_id").notNull(),
    scores: jsonb("scores").notNull().default([]).$type<RubricScore[]>(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("submission_rubric_idx").on(t.submissionId)],
);

export type AssignmentRubric = typeof assignmentRubricsTable.$inferSelect;
export type SubmissionRubricScore = typeof submissionRubricScoresTable.$inferSelect;
