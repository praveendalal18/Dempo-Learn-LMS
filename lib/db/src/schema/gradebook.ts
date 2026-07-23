import { pgTable, text, serial, integer, timestamp, uniqueIndex } from "drizzle-orm/pg-core";

// Weighted grade categories for a course (e.g. Assignments 40, Quizzes 30,
// Participation 30). Weights are relative and normalized at compute time.
export const gradebookCategoriesTable = pgTable("gradebook_categories", {
  id: serial("id").primaryKey(),
  courseId: integer("course_id").notNull(),
  name: text("name").notNull(),
  weight: integer("weight").notNull().default(0),
  position: integer("position").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// Maps a grade item (assignment or quiz) to a category. itemType = 'assignment' | 'quiz'.
export const gradeItemCategoriesTable = pgTable(
  "grade_item_categories",
  {
    id: serial("id").primaryKey(),
    courseId: integer("course_id").notNull(),
    itemType: text("item_type").notNull(),
    itemId: integer("item_id").notNull(),
    categoryId: integer("category_id").notNull(),
  },
  (t) => [uniqueIndex("grade_item_category_idx").on(t.courseId, t.itemType, t.itemId)],
);

export type GradebookCategory = typeof gradebookCategoriesTable.$inferSelect;
export type GradeItemCategory = typeof gradeItemCategoriesTable.$inferSelect;
