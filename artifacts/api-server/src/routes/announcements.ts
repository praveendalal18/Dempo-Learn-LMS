import { Router, type IRouter, type Request, type Response } from "express";
import { z } from "zod";
import { and, desc, eq } from "drizzle-orm";
import { db, messagesTable, usersTable } from "@workspace/db";
import { requireAuth } from "../middlewares/auth";
import { getCourse, isCourseTeacher, canAccessCourse } from "../lib/authz";
import { notifyCourseStudents } from "../lib/notifications";

const router: IRouter = Router();

// GET a course's announcements feed (course members)
router.get("/courses/:courseId/announcements", requireAuth, async (req: Request, res: Response) => {
  const courseId = Number(req.params.courseId);
  if (!Number.isInteger(courseId)) { res.status(400).json({ error: "Invalid course id" }); return; }
  const course = await getCourse(courseId);
  if (!course) { res.status(404).json({ error: "Course not found" }); return; }
  if (!(await canAccessCourse(course, req.localUser!))) { res.status(403).json({ error: "Forbidden" }); return; }

  const rows = await db
    .select({
      id: messagesTable.id,
      body: messagesTable.body,
      createdAt: messagesTable.createdAt,
      senderId: messagesTable.senderId,
      senderName: usersTable.name,
    })
    .from(messagesTable)
    .leftJoin(usersTable, eq(usersTable.id, messagesTable.senderId))
    .where(and(eq(messagesTable.courseId, courseId), eq(messagesTable.isAnnouncement, true)))
    .orderBy(desc(messagesTable.createdAt));

  res.json(rows.map((r) => ({ ...r, senderName: r.senderName || "Professor" })));
});

// POST a course announcement (course teacher only)
router.post("/courses/:courseId/announcements", requireAuth, async (req: Request, res: Response) => {
  const courseId = Number(req.params.courseId);
  if (!Number.isInteger(courseId)) { res.status(400).json({ error: "Invalid course id" }); return; }
  const course = await getCourse(courseId);
  if (!course) { res.status(404).json({ error: "Course not found" }); return; }
  if (!isCourseTeacher(course, req.localUser!)) { res.status(403).json({ error: "Only the course professor can post announcements" }); return; }
  const parsed = z.object({ body: z.string().trim().min(1).max(8000) }).safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  const [msg] = await db
    .insert(messagesTable)
    .values({ courseId, senderId: req.localUser!.id, recipientId: null, body: parsed.data.body, isAnnouncement: true })
    .returning();

  void notifyCourseStudents(courseId, {
    type: "announcement.posted",
    title: `Announcement in ${course.title}`,
    body: parsed.data.body.slice(0, 140),
    link: `/course/${courseId}?tab=announcements`,
    refId: msg.id,
  });

  res.status(201).json({ ok: true, id: msg.id });
});

export default router;
