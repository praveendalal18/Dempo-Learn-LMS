import { pgTable, text, serial, integer, boolean, timestamp } from "drizzle-orm/pg-core";

// A discussion / Q&A thread in a course.
export const discussionThreadsTable = pgTable("discussion_threads", {
  id: serial("id").primaryKey(),
  courseId: integer("course_id").notNull(),
  authorId: text("author_id").notNull(),
  title: text("title").notNull(),
  body: text("body").notNull(),
  resolved: boolean("resolved").notNull().default(false),
  pinned: boolean("pinned").notNull().default(false),
  lastActivityAt: timestamp("last_activity_at", { withTimezone: true }).notNull().defaultNow(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// A reply within a thread. isAnswer marks an accepted answer (Q&A).
export const discussionPostsTable = pgTable("discussion_posts", {
  id: serial("id").primaryKey(),
  threadId: integer("thread_id").notNull(),
  courseId: integer("course_id").notNull(),
  authorId: text("author_id").notNull(),
  body: text("body").notNull(),
  isAnswer: boolean("is_answer").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type DiscussionThread = typeof discussionThreadsTable.$inferSelect;
export type DiscussionPost = typeof discussionPostsTable.$inferSelect;
