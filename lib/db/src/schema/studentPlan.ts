import { pgTable, text, serial, integer, boolean, jsonb, timestamp } from "drizzle-orm/pg-core";

// A student's personal to-do / plan item. Can be free-form or created from a
// session / assignment ("add to my plan"). Optional reminder fires as an
// in-app notification once remindAt passes.
export const studentTasksTable = pgTable("student_tasks", {
  id: serial("id").primaryKey(),
  studentId: text("student_id").notNull(),
  title: text("title").notNull(),
  note: text("note"),
  dueAt: timestamp("due_at", { withTimezone: true }),
  remindAt: timestamp("remind_at", { withTimezone: true }),
  reminded: boolean("reminded").notNull().default(false),
  tags: jsonb("tags").notNull().default([]).$type<string[]>(),
  courseId: integer("course_id"),
  // Where it came from, so the focus feed can mark a derived item done.
  sourceType: text("source_type"), // session | prework | postwork | assignment | quiz | custom
  sourceRef: text("source_ref"), // e.g. `${courseId}:${hour}` or assignment id
  done: boolean("done").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// A student's course note. Private by default; sharing makes it visible to
// every enrolled student in that course.
export const studentNotesTable = pgTable("student_notes", {
  id: serial("id").primaryKey(),
  courseId: integer("course_id").notNull(),
  authorId: text("author_id").notNull(),
  title: text("title"),
  body: text("body").notNull(),
  tags: jsonb("tags").notNull().default([]).$type<string[]>(),
  shared: boolean("shared").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type StudentTask = typeof studentTasksTable.$inferSelect;
export type StudentNote = typeof studentNotesTable.$inferSelect;
