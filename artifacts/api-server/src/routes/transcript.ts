import { Router, type IRouter, type Request, type Response } from "express";
import { eq, inArray } from "drizzle-orm";
import {
  db,
  coursesTable,
  enrollmentsTable,
  usersTable,
  assignmentsTable,
  submissionsTable,
  quizzesTable,
  quizAttemptsTable,
} from "@workspace/db";
import { requireAuth } from "../middlewares/auth";
import { getActiveEnrolledCourseIds } from "../lib/authz";
import { loadWeightConfig, weightedOverall, type ItemPct } from "../lib/gradebookWeighting";

const router: IRouter = Router();

// A student's cross-course transcript: one row per enrolled course with the
// weighted final grade. Downloadable by the student themselves.
router.get("/me/transcript.csv", requireAuth, async (req: Request, res: Response) => {
  const me = req.localUser!;
  const courseIds = await getActiveEnrolledCourseIds(me.id);

  const rows: unknown[][] = [];
  if (courseIds.length) {
    const courses = await db.select().from(coursesTable).where(inArray(coursesTable.id, courseIds));
    const teacherIds = Array.from(new Set(courses.map((c) => c.teacherId)));
    const teachers = teacherIds.length
      ? await db.select({ id: usersTable.id, name: usersTable.name }).from(usersTable).where(inArray(usersTable.id, teacherIds))
      : [];
    const teacherName = new Map(teachers.map((t) => [t.id, t.name]));

    for (const course of courses) {
      const items: ItemPct[] = [];
      const asgs = await db.select({ id: assignmentsTable.id, maxScore: assignmentsTable.maxScore }).from(assignmentsTable).where(eq(assignmentsTable.courseId, course.id));
      const asgById = new Map(asgs.map((a) => [a.id, a]));
      const asgIds = asgs.map((a) => a.id);
      if (asgIds.length) {
        const subs = await db.select().from(submissionsTable).where(inArray(submissionsTable.assignmentId, asgIds));
        for (const s of subs) {
          if (s.studentId !== me.id) continue;
          const a = asgById.get(s.assignmentId);
          if (a && s.status === "graded" && s.score != null && a.maxScore) items.push({ key: `assignment:${s.assignmentId}`, pct: (s.score / a.maxScore) * 100 });
        }
      }
      const quizzes = await db.select({ id: quizzesTable.id }).from(quizzesTable).where(eq(quizzesTable.courseId, course.id));
      const quizIds = quizzes.map((q) => q.id);
      if (quizIds.length) {
        const attempts = await db.select().from(quizAttemptsTable).where(inArray(quizAttemptsTable.quizId, quizIds));
        for (const at of attempts) {
          if (at.studentId !== me.id) continue;
          if (at.score != null && at.maxScore) items.push({ key: `quiz:${at.quizId}`, pct: (at.score / at.maxScore) * 100 });
        }
      }
      const cfg = await loadWeightConfig(course.id);
      const final = weightedOverall(items, cfg);
      rows.push([course.title, teacherName.get(course.teacherId) ?? "", final == null ? "" : Math.round(final), items.length]);
    }
  }

  const esc = (v: unknown) => { const s = v == null ? "" : String(v); return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
  const csv = [
    ["Course", "Professor", "Final grade (%)", "Graded items"].map(esc).join(","),
    ...rows.map((r) => r.map(esc).join(",")),
  ].join("\n");
  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", `attachment; filename="dempo-transcript-${(me.name || "student").replace(/[^a-z0-9]+/gi, "-").toLowerCase()}.csv"`);
  res.send(csv);
});

export default router;
