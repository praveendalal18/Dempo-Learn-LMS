import { Router, type IRouter, type Request, type Response } from "express";
import { z } from "zod";
import { and, desc, eq } from "drizzle-orm";
import {
  db,
  coursesTable,
  usersTable,
  earlyAlertsTable,
  coordinatorCourseAssignmentsTable,
  type Course,
  type User,
} from "@workspace/db";
import { requireAuth } from "../middlewares/auth";
import { getCourse, isCourseTeacher, isAssignedCoordinator } from "../lib/authz";
import { createNotifications } from "../lib/notifications";

const router: IRouter = Router();

async function canManage(course: Course, user: User): Promise<boolean> {
  if (user.role === "dean") return true;
  if (user.role === "course_coordinator") return isAssignedCoordinator(course.id, user);
  return isCourseTeacher(course, user);
}

// POST an early-alert nudge for a student.
router.post("/courses/:courseId/early-alert", requireAuth, async (req: Request, res: Response) => {
  const courseId = Number(req.params.courseId);
  if (!Number.isInteger(courseId)) { res.status(400).json({ error: "Invalid course id" }); return; }
  const course = await getCourse(courseId);
  if (!course) { res.status(404).json({ error: "Course not found" }); return; }
  const sender = req.localUser!;
  if (!(await canManage(course, sender))) { res.status(403).json({ error: "Forbidden" }); return; }
  const parsed = z.object({
    studentId: z.string().min(1),
    reason: z.string().trim().min(1).max(200),
    note: z.string().trim().max(2000).optional(),
  }).safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  const [student] = await db.select().from(usersTable).where(eq(usersTable.id, parsed.data.studentId));
  if (!student) { res.status(404).json({ error: "Student not found" }); return; }

  const [alert] = await db
    .insert(earlyAlertsTable)
    .values({ courseId, studentId: parsed.data.studentId, senderId: sender.id, reason: parsed.data.reason, note: parsed.data.note || null })
    .returning();

  // Notify the student, plus oversight (deans + assigned coordinators + the
  // course teacher), excluding whoever raised the alert.
  const deans = await db.select({ id: usersTable.id }).from(usersTable).where(eq(usersTable.role, "dean"));
  const coordinators = await db
    .select({ id: coordinatorCourseAssignmentsTable.coordinatorId })
    .from(coordinatorCourseAssignmentsTable)
    .where(eq(coordinatorCourseAssignmentsTable.courseId, courseId));

  const oversightIds = new Set<string>([course.teacherId, ...deans.map((d) => d.id), ...coordinators.map((c) => c.id)]);
  oversightIds.delete(sender.id);

  const studentName = student.name || student.email;
  const rows = [
    {
      userId: parsed.data.studentId,
      type: "early_alert",
      title: `A check-in from ${course.title}`,
      body: parsed.data.note || `Your instructor flagged: ${parsed.data.reason}. Let's get you back on track.`,
      link: `/course/${courseId}`,
      courseId,
      refId: alert.id,
    },
    ...Array.from(oversightIds).map((uid) => ({
      userId: uid,
      type: "early_alert",
      title: `Early alert: ${studentName}`,
      body: `${parsed.data.reason}${parsed.data.note ? ` — ${parsed.data.note}` : ""} (${course.title})`,
      link: `/analytics/course/${courseId}`,
      courseId,
      refId: alert.id,
    })),
  ];
  void createNotifications(rows);

  res.status(201).json({ ok: true, id: alert.id });
});

// GET early-alerts for a course.
router.get("/courses/:courseId/early-alerts", requireAuth, async (req: Request, res: Response) => {
  const courseId = Number(req.params.courseId);
  if (!Number.isInteger(courseId)) { res.status(400).json({ error: "Invalid course id" }); return; }
  const course = await getCourse(courseId);
  if (!course) { res.status(404).json({ error: "Course not found" }); return; }
  if (!(await canManage(course, req.localUser!))) { res.status(403).json({ error: "Forbidden" }); return; }

  const rows = await db
    .select({
      id: earlyAlertsTable.id,
      studentId: earlyAlertsTable.studentId,
      studentName: usersTable.name,
      reason: earlyAlertsTable.reason,
      note: earlyAlertsTable.note,
      createdAt: earlyAlertsTable.createdAt,
    })
    .from(earlyAlertsTable)
    .leftJoin(usersTable, eq(usersTable.id, earlyAlertsTable.studentId))
    .where(eq(earlyAlertsTable.courseId, courseId))
    .orderBy(desc(earlyAlertsTable.createdAt));
  res.json(rows);
});

export default router;
