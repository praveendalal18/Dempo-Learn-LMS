import { Router, type IRouter, type Request, type Response } from "express";
import { z } from "zod";
import { and, eq } from "drizzle-orm";
import {
  db,
  classSessionsTable,
  attendanceTable,
  enrollmentsTable,
  usersTable,
} from "@workspace/db";
import { requireAuth } from "../middlewares/auth";
import { getCourse, isCourseTeacher, canViewCourse } from "../lib/authz";

const router: IRouter = Router();

const STATUSES = ["present", "absent", "late", "excused"] as const;

async function loadSession(courseId: number, sessionId: number) {
  const [session] = await db
    .select()
    .from(classSessionsTable)
    .where(and(eq(classSessionsTable.id, sessionId), eq(classSessionsTable.courseId, courseId)));
  return session;
}

// GET roster + attendance for one session (teacher / dean / assigned coordinator)
router.get(
  "/courses/:courseId/sessions/:sessionId/attendance",
  requireAuth,
  async (req: Request, res: Response) => {
    const courseId = Number(req.params.courseId);
    const sessionId = Number(req.params.sessionId);
    if (!Number.isInteger(courseId) || !Number.isInteger(sessionId)) {
      res.status(400).json({ error: "Invalid id" });
      return;
    }
    const course = await getCourse(courseId);
    if (!course) { res.status(404).json({ error: "Course not found" }); return; }
    if (!(await canViewCourse(course, req.localUser!))) {
      res.status(403).json({ error: "Forbidden" }); return;
    }
    const session = await loadSession(courseId, sessionId);
    if (!session) { res.status(404).json({ error: "Session not found" }); return; }

    const students = await db
      .select({ id: usersTable.id, name: usersTable.name, email: usersTable.email, avatarUrl: usersTable.avatarUrl })
      .from(enrollmentsTable)
      .innerJoin(usersTable, eq(usersTable.id, enrollmentsTable.studentId))
      .where(eq(enrollmentsTable.courseId, courseId))
      .orderBy(usersTable.name);

    const rows = await db
      .select({ studentId: attendanceTable.studentId, status: attendanceTable.status })
      .from(attendanceTable)
      .where(eq(attendanceTable.sessionId, sessionId));
    const byStudent = new Map(rows.map((r) => [r.studentId, r.status]));

    res.json({
      session: { id: session.id, title: session.title, startsAt: session.startsAt },
      canEdit: isCourseTeacher(course, req.localUser!),
      students: students.map((s) => ({ ...s, status: byStudent.get(s.id) ?? null })),
    });
  },
);

// PUT bulk-set attendance for a session (course teacher only)
const putSchema = z.object({
  records: z
    .array(z.object({ studentId: z.string().min(1), status: z.enum(STATUSES) }))
    .max(1000),
});

router.put(
  "/courses/:courseId/sessions/:sessionId/attendance",
  requireAuth,
  async (req: Request, res: Response) => {
    const courseId = Number(req.params.courseId);
    const sessionId = Number(req.params.sessionId);
    if (!Number.isInteger(courseId) || !Number.isInteger(sessionId)) {
      res.status(400).json({ error: "Invalid id" });
      return;
    }
    const course = await getCourse(courseId);
    if (!course) { res.status(404).json({ error: "Course not found" }); return; }
    if (!isCourseTeacher(course, req.localUser!)) {
      res.status(403).json({ error: "Only the course teacher can mark attendance" }); return;
    }
    const session = await loadSession(courseId, sessionId);
    if (!session) { res.status(404).json({ error: "Session not found" }); return; }

    const parsed = putSchema.safeParse(req.body);
    if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

    const markedBy = req.localUser!.id;
    for (const rec of parsed.data.records) {
      await db
        .insert(attendanceTable)
        .values({ sessionId, courseId, studentId: rec.studentId, status: rec.status, markedBy })
        .onConflictDoUpdate({
          target: [attendanceTable.sessionId, attendanceTable.studentId],
          set: { status: rec.status, markedBy, updatedAt: new Date() },
        });
    }
    res.json({ ok: true, marked: parsed.data.records.length });
  },
);

export default router;
