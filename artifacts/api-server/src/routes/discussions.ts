import { Router, type IRouter, type Request, type Response } from "express";
import { z } from "zod";
import { and, desc, eq, inArray } from "drizzle-orm";
import {
  db,
  usersTable,
  discussionThreadsTable,
  discussionPostsTable,
} from "@workspace/db";
import { requireAuth } from "../middlewares/auth";
import { getCourse, isCourseTeacher, canAccessCourse } from "../lib/authz";
import { createNotifications } from "../lib/notifications";

const router: IRouter = Router();

// GET threads for a course (members)
router.get("/courses/:courseId/discussions", requireAuth, async (req: Request, res: Response) => {
  const courseId = Number(req.params.courseId);
  if (!Number.isInteger(courseId)) { res.status(400).json({ error: "Invalid course id" }); return; }
  const course = await getCourse(courseId);
  if (!course) { res.status(404).json({ error: "Course not found" }); return; }
  if (!(await canAccessCourse(course, req.localUser!))) { res.status(403).json({ error: "Forbidden" }); return; }

  const threads = await db
    .select({
      id: discussionThreadsTable.id,
      title: discussionThreadsTable.title,
      authorId: discussionThreadsTable.authorId,
      authorName: usersTable.name,
      resolved: discussionThreadsTable.resolved,
      pinned: discussionThreadsTable.pinned,
      lastActivityAt: discussionThreadsTable.lastActivityAt,
      createdAt: discussionThreadsTable.createdAt,
    })
    .from(discussionThreadsTable)
    .leftJoin(usersTable, eq(usersTable.id, discussionThreadsTable.authorId))
    .where(eq(discussionThreadsTable.courseId, courseId))
    .orderBy(desc(discussionThreadsTable.pinned), desc(discussionThreadsTable.lastActivityAt));

  const ids = threads.map((t) => t.id);
  const counts = new Map<number, number>();
  if (ids.length) {
    const posts = await db.select({ threadId: discussionPostsTable.threadId }).from(discussionPostsTable).where(inArray(discussionPostsTable.threadId, ids));
    for (const p of posts) counts.set(p.threadId, (counts.get(p.threadId) ?? 0) + 1);
  }
  res.json(threads.map((t) => ({ ...t, authorName: t.authorName || "User", replyCount: counts.get(t.id) ?? 0 })));
});

// POST create thread (members)
router.post("/courses/:courseId/discussions", requireAuth, async (req: Request, res: Response) => {
  const courseId = Number(req.params.courseId);
  if (!Number.isInteger(courseId)) { res.status(400).json({ error: "Invalid course id" }); return; }
  const course = await getCourse(courseId);
  if (!course) { res.status(404).json({ error: "Course not found" }); return; }
  if (!(await canAccessCourse(course, req.localUser!))) { res.status(403).json({ error: "Forbidden" }); return; }
  const parsed = z.object({ title: z.string().trim().min(1).max(200), body: z.string().trim().min(1).max(8000) }).safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const [thread] = await db
    .insert(discussionThreadsTable)
    .values({ courseId, authorId: req.localUser!.id, title: parsed.data.title, body: parsed.data.body })
    .returning();
  res.status(201).json(thread);
});

// GET thread detail + posts (members)
router.get("/courses/:courseId/discussions/:threadId", requireAuth, async (req: Request, res: Response) => {
  const courseId = Number(req.params.courseId);
  const threadId = Number(req.params.threadId);
  if (!Number.isInteger(courseId) || !Number.isInteger(threadId)) { res.status(400).json({ error: "Invalid id" }); return; }
  const course = await getCourse(courseId);
  if (!course) { res.status(404).json({ error: "Course not found" }); return; }
  if (!(await canAccessCourse(course, req.localUser!))) { res.status(403).json({ error: "Forbidden" }); return; }
  const [thread] = await db
    .select({
      id: discussionThreadsTable.id, title: discussionThreadsTable.title, body: discussionThreadsTable.body,
      authorId: discussionThreadsTable.authorId, authorName: usersTable.name,
      resolved: discussionThreadsTable.resolved, pinned: discussionThreadsTable.pinned, createdAt: discussionThreadsTable.createdAt,
    })
    .from(discussionThreadsTable)
    .leftJoin(usersTable, eq(usersTable.id, discussionThreadsTable.authorId))
    .where(and(eq(discussionThreadsTable.id, threadId), eq(discussionThreadsTable.courseId, courseId)));
  if (!thread) { res.status(404).json({ error: "Thread not found" }); return; }
  const posts = await db
    .select({
      id: discussionPostsTable.id, body: discussionPostsTable.body, isAnswer: discussionPostsTable.isAnswer,
      authorId: discussionPostsTable.authorId, authorName: usersTable.name, createdAt: discussionPostsTable.createdAt,
    })
    .from(discussionPostsTable)
    .leftJoin(usersTable, eq(usersTable.id, discussionPostsTable.authorId))
    .where(eq(discussionPostsTable.threadId, threadId))
    .orderBy(discussionPostsTable.createdAt);
  res.json({
    thread: { ...thread, authorName: thread.authorName || "User", canModerate: isCourseTeacher(course, req.localUser!) || thread.authorId === req.localUser!.id },
    posts: posts.map((p) => ({ ...p, authorName: p.authorName || "User" })),
  });
});

// POST reply (members)
router.post("/courses/:courseId/discussions/:threadId/posts", requireAuth, async (req: Request, res: Response) => {
  const courseId = Number(req.params.courseId);
  const threadId = Number(req.params.threadId);
  if (!Number.isInteger(courseId) || !Number.isInteger(threadId)) { res.status(400).json({ error: "Invalid id" }); return; }
  const course = await getCourse(courseId);
  if (!course) { res.status(404).json({ error: "Course not found" }); return; }
  if (!(await canAccessCourse(course, req.localUser!))) { res.status(403).json({ error: "Forbidden" }); return; }
  const [thread] = await db.select().from(discussionThreadsTable).where(and(eq(discussionThreadsTable.id, threadId), eq(discussionThreadsTable.courseId, courseId)));
  if (!thread) { res.status(404).json({ error: "Thread not found" }); return; }
  const parsed = z.object({ body: z.string().trim().min(1).max(8000) }).safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  const me = req.localUser!;
  const [post] = await db.insert(discussionPostsTable).values({ threadId, courseId, authorId: me.id, body: parsed.data.body }).returning();
  await db.update(discussionThreadsTable).set({ lastActivityAt: new Date() }).where(eq(discussionThreadsTable.id, threadId));

  // Notify the thread author and the course teacher (excluding the replier).
  const recipients = new Set<string>([thread.authorId, course.teacherId]);
  recipients.delete(me.id);
  if (recipients.size) {
    void createNotifications(
      Array.from(recipients).map((uid) => ({
        userId: uid,
        type: "discussion.reply",
        title: `New reply in "${thread.title}"`,
        body: parsed.data.body.slice(0, 140),
        link: `/course/${courseId}?tab=discussion&thread=${threadId}`,
        courseId,
        refId: threadId,
      })),
    );
  }
  res.status(201).json(post);
});

// PATCH thread: resolve (author/teacher) or pin (teacher only)
router.patch("/courses/:courseId/discussions/:threadId", requireAuth, async (req: Request, res: Response) => {
  const courseId = Number(req.params.courseId);
  const threadId = Number(req.params.threadId);
  if (!Number.isInteger(courseId) || !Number.isInteger(threadId)) { res.status(400).json({ error: "Invalid id" }); return; }
  const course = await getCourse(courseId);
  if (!course) { res.status(404).json({ error: "Course not found" }); return; }
  const [thread] = await db.select().from(discussionThreadsTable).where(and(eq(discussionThreadsTable.id, threadId), eq(discussionThreadsTable.courseId, courseId)));
  if (!thread) { res.status(404).json({ error: "Thread not found" }); return; }
  const me = req.localUser!;
  const teacher = isCourseTeacher(course, me);
  const parsed = z.object({ resolved: z.boolean().optional(), pinned: z.boolean().optional() }).safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const patch: { resolved?: boolean; pinned?: boolean } = {};
  if (parsed.data.resolved !== undefined) {
    if (!teacher && thread.authorId !== me.id) { res.status(403).json({ error: "Only the author or teacher can resolve" }); return; }
    patch.resolved = parsed.data.resolved;
  }
  if (parsed.data.pinned !== undefined) {
    if (!teacher) { res.status(403).json({ error: "Only the teacher can pin" }); return; }
    patch.pinned = parsed.data.pinned;
  }
  if (Object.keys(patch).length === 0) { res.status(400).json({ error: "Nothing to update" }); return; }
  await db.update(discussionThreadsTable).set(patch).where(eq(discussionThreadsTable.id, threadId));
  res.json({ ok: true });
});

// POST mark/unmark a post as the answer (author of thread or teacher)
router.post("/courses/:courseId/discussions/:threadId/posts/:postId/answer", requireAuth, async (req: Request, res: Response) => {
  const courseId = Number(req.params.courseId);
  const threadId = Number(req.params.threadId);
  const postId = Number(req.params.postId);
  if (![courseId, threadId, postId].every(Number.isInteger)) { res.status(400).json({ error: "Invalid id" }); return; }
  const course = await getCourse(courseId);
  if (!course) { res.status(404).json({ error: "Course not found" }); return; }
  const [thread] = await db.select().from(discussionThreadsTable).where(and(eq(discussionThreadsTable.id, threadId), eq(discussionThreadsTable.courseId, courseId)));
  if (!thread) { res.status(404).json({ error: "Thread not found" }); return; }
  const me = req.localUser!;
  if (!isCourseTeacher(course, me) && thread.authorId !== me.id) { res.status(403).json({ error: "Only the author or teacher can accept an answer" }); return; }
  const parsed = z.object({ isAnswer: z.boolean() }).safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  await db.update(discussionPostsTable).set({ isAnswer: parsed.data.isAnswer }).where(and(eq(discussionPostsTable.id, postId), eq(discussionPostsTable.threadId, threadId)));
  if (parsed.data.isAnswer) await db.update(discussionThreadsTable).set({ resolved: true }).where(eq(discussionThreadsTable.id, threadId));
  res.json({ ok: true });
});

// DELETE a thread (author or teacher)
router.delete("/courses/:courseId/discussions/:threadId", requireAuth, async (req: Request, res: Response) => {
  const courseId = Number(req.params.courseId);
  const threadId = Number(req.params.threadId);
  if (!Number.isInteger(courseId) || !Number.isInteger(threadId)) { res.status(400).json({ error: "Invalid id" }); return; }
  const course = await getCourse(courseId);
  if (!course) { res.status(404).json({ error: "Course not found" }); return; }
  const [thread] = await db.select().from(discussionThreadsTable).where(and(eq(discussionThreadsTable.id, threadId), eq(discussionThreadsTable.courseId, courseId)));
  if (!thread) { res.status(404).json({ error: "Thread not found" }); return; }
  const me = req.localUser!;
  if (!isCourseTeacher(course, me) && thread.authorId !== me.id) { res.status(403).json({ error: "Forbidden" }); return; }
  await db.transaction(async (tx) => {
    await tx.delete(discussionPostsTable).where(eq(discussionPostsTable.threadId, threadId));
    await tx.delete(discussionThreadsTable).where(eq(discussionThreadsTable.id, threadId));
  });
  res.json({ ok: true });
});

// DELETE a post (author or teacher)
router.delete("/courses/:courseId/discussions/:threadId/posts/:postId", requireAuth, async (req: Request, res: Response) => {
  const courseId = Number(req.params.courseId);
  const postId = Number(req.params.postId);
  if (!Number.isInteger(courseId) || !Number.isInteger(postId)) { res.status(400).json({ error: "Invalid id" }); return; }
  const course = await getCourse(courseId);
  if (!course) { res.status(404).json({ error: "Course not found" }); return; }
  const [post] = await db.select().from(discussionPostsTable).where(and(eq(discussionPostsTable.id, postId), eq(discussionPostsTable.courseId, courseId)));
  if (!post) { res.status(404).json({ error: "Post not found" }); return; }
  const me = req.localUser!;
  if (!isCourseTeacher(course, me) && post.authorId !== me.id) { res.status(403).json({ error: "Forbidden" }); return; }
  await db.delete(discussionPostsTable).where(eq(discussionPostsTable.id, postId));
  res.json({ ok: true });
});

export default router;
