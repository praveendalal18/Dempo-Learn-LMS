import { Router, type IRouter, type Request, type Response } from "express";
import { and, eq, gte, inArray } from "drizzle-orm";
import {
  db,
  coursesTable,
  enrollmentsTable,
  usersTable,
  assignmentsTable,
  submissionsTable,
  quizzesTable,
  quizAttemptsTable,
  activityLogsTable,
  attendanceTable,
  classSessionsTable,
  courseFeedbackTable,
  cohortsTable,
  cohortMembersTable,
  type Course,
  type User,
} from "@workspace/db";
import { requireAuth } from "../middlewares/auth";
import { getCourse, isCourseTeacher } from "../lib/authz";

const router: IRouter = Router();

const DAY = 86_400_000;
const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);
const round = (n: number | null) => (n == null ? null : Math.round(n));

function canSeeIdentities(user: User): boolean {
  return user.role === "dean" || user.role === "course_coordinator";
}

// Analytics scope: dean & coordinator see everything (per product spec);
// teachers see their own courses; everyone else is denied.
async function scopeCourseIds(user: User): Promise<number[] | "all" | null> {
  if (user.role === "dean" || user.role === "course_coordinator") return "all";
  if (user.role === "teacher") {
    const rows = await db.select({ id: coursesTable.id }).from(coursesTable).where(eq(coursesTable.teacherId, user.id));
    return rows.map((r) => r.id);
  }
  return null;
}

function canViewCourseAnalytics(course: Course, user: User): boolean {
  if (user.role === "dean" || user.role === "course_coordinator") return true;
  return isCourseTeacher(course, user);
}

type CourseMetrics = Awaited<ReturnType<typeof computeCourseMetrics>>;

async function computeCourseMetrics(course: Course) {
  const courseId = course.id;
  const now = new Date();
  const d7 = new Date(now.getTime() - 7 * DAY);
  const d14 = new Date(now.getTime() - 14 * DAY);
  const d30 = new Date(now.getTime() - 30 * DAY);

  const students = await db
    .select({ id: usersTable.id, name: usersTable.name, email: usersTable.email })
    .from(enrollmentsTable)
    .innerJoin(usersTable, eq(usersTable.id, enrollmentsTable.studentId))
    .where(eq(enrollmentsTable.courseId, courseId))
    .orderBy(usersTable.name);
  const studentIds = students.map((s) => s.id);
  const nameById = new Map(students.map((s) => [s.id, s.name || s.email]));

  // Per-student percentage scores (submissions + quizzes) for overall/at-risk.
  const pctByStudent = new Map<string, number[]>();
  const push = (id: string, pct: number) => {
    const arr = pctByStudent.get(id) ?? [];
    arr.push(pct);
    pctByStudent.set(id, arr);
  };
  const allPcts: number[] = [];

  // Assignments + submissions
  const asgs = await db
    .select({ id: assignmentsTable.id, dueDate: assignmentsTable.dueDate, maxScore: assignmentsTable.maxScore })
    .from(assignmentsTable)
    .where(eq(assignmentsTable.courseId, courseId));
  const asgById = new Map(asgs.map((a) => [a.id, a]));
  const asgIds = asgs.map((a) => a.id);

  let subTotal = 0, graded = 0, pending = 0, onTime = 0, dueConsidered = 0;
  if (asgIds.length) {
    const subs = await db.select().from(submissionsTable).where(inArray(submissionsTable.assignmentId, asgIds));
    for (const s of subs) {
      const a = asgById.get(s.assignmentId);
      if (!a) continue;
      subTotal++;
      if (s.status === "graded" && s.score != null && a.maxScore) {
        graded++;
        const pct = (s.score / a.maxScore) * 100;
        push(s.studentId, pct);
        allPcts.push(pct);
      } else if (s.status === "submitted") pending++;
      if (s.submittedAt && a.dueDate) {
        dueConsidered++;
        if (new Date(s.submittedAt).getTime() <= new Date(a.dueDate).getTime()) onTime++;
      }
    }
  }
  const onTimeRate = dueConsidered ? round((onTime / dueConsidered) * 100) : null;

  // Quizzes + attempts
  const quizzes = await db.select({ id: quizzesTable.id }).from(quizzesTable).where(eq(quizzesTable.courseId, courseId));
  const quizIds = quizzes.map((q) => q.id);
  let quizGraded = 0;
  const quizPcts: number[] = [];
  if (quizIds.length) {
    const attempts = await db.select().from(quizAttemptsTable).where(inArray(quizAttemptsTable.quizId, quizIds));
    for (const at of attempts) {
      if (at.score != null && at.maxScore) {
        const pct = (at.score / at.maxScore) * 100;
        quizGraded++;
        quizPcts.push(pct);
        push(at.studentId, pct);
        allPcts.push(pct);
      }
    }
  }

  const overallByStudent = new Map<string, number>();
  for (const [id, arr] of pctByStudent) overallByStudent.set(id, mean(arr)!);

  // Grade distribution (of student overall %)
  const bands = [
    { band: "<50", min: -1, max: 50, count: 0 },
    { band: "50–64", min: 50, max: 65, count: 0 },
    { band: "65–74", min: 65, max: 75, count: 0 },
    { band: "75–84", min: 75, max: 85, count: 0 },
    { band: "85–100", min: 85, max: 101, count: 0 },
  ];
  for (const [, o] of overallByStudent) {
    const b = bands.find((x) => o >= x.min && o < x.max);
    if (b) b.count++;
  }

  // Engagement (activity logs, last 30d window)
  const active7 = new Set<string>();
  const active30 = new Set<string>();
  let logins30 = 0;
  const lastActive = new Map<string, Date>();
  if (studentIds.length) {
    const logs = await db
      .select({ userId: activityLogsTable.userId, action: activityLogsTable.action, createdAt: activityLogsTable.createdAt })
      .from(activityLogsTable)
      .where(and(inArray(activityLogsTable.userId, studentIds), gte(activityLogsTable.createdAt, d30)));
    for (const l of logs) {
      if (!l.userId) continue;
      const t = new Date(l.createdAt);
      active30.add(l.userId);
      if (t >= d7) active7.add(l.userId);
      if (l.action === "auth.login") logins30++;
      if (!lastActive.has(l.userId) || t > lastActive.get(l.userId)!) lastActive.set(l.userId, t);
    }
  }

  // Attendance
  const sessions = await db.select({ id: classSessionsTable.id }).from(classSessionsTable).where(eq(classSessionsTable.courseId, courseId));
  const att = await db.select({ studentId: attendanceTable.studentId, status: attendanceTable.status }).from(attendanceTable).where(eq(attendanceTable.courseId, courseId));
  let attPresent = 0;
  for (const a of att) if (a.status === "present" || a.status === "late") attPresent++;
  const attendanceRate = att.length ? round((attPresent / att.length) * 100) : null;

  // At-risk: low overall (<50%) or inactive (no activity in 14d)
  const atRisk = students
    .map((s) => {
      const o = overallByStudent.get(s.id) ?? null;
      const la = lastActive.get(s.id) ?? null;
      const inactive = !la || la < d14;
      const lowScore = o != null && o < 50;
      if (!inactive && !lowScore) return null;
      return {
        studentId: s.id,
        name: nameById.get(s.id) ?? "Student",
        overallPct: o == null ? null : Math.round(o),
        lastActiveAt: la ? la.toISOString() : null,
        reason: lowScore ? (inactive ? "low score + inactive" : "low score") : "inactive",
      };
    })
    .filter(Boolean)
    .slice(0, 100);

  // Feedback (identity kept; stripped per-viewer at the endpoint)
  const fb = await db
    .select()
    .from(courseFeedbackTable)
    .leftJoin(usersTable, eq(usersTable.id, courseFeedbackTable.studentId))
    .where(eq(courseFeedbackTable.courseId, courseId));
  const feedbackRows = fb.map((r) => ({
    overall: r.course_feedback.overallRating,
    content: r.course_feedback.contentRating,
    teaching: r.course_feedback.teachingRating,
    workload: r.course_feedback.workloadRating,
    comment: r.course_feedback.comment,
    studentName: r.users?.name || r.users?.email || "Student",
    updatedAt: r.course_feedback.updatedAt,
  }));

  return {
    course: { id: course.id, title: course.title },
    enrolledCount: students.length,
    submissions: { total: subTotal, graded, pending, onTimeRate },
    avgScore: round(mean(allPcts)),
    quiz: { count: quizzes.length, graded: quizGraded, avgScore: round(mean(quizPcts)) },
    gradeDistribution: bands.map((b) => ({ band: b.band, count: b.count })),
    engagement: { active7: active7.size, active30: active30.size, logins30 },
    attendance: { rate: attendanceRate, sessions: sessions.length, marked: att.length },
    atRisk,
    feedback: {
      count: feedbackRows.length,
      avgOverall: round(mean(feedbackRows.map((f) => f.overall))),
      avgContent: round(mean(feedbackRows.filter((f) => f.content != null).map((f) => f.content as number))),
      avgTeaching: round(mean(feedbackRows.filter((f) => f.teaching != null).map((f) => f.teaching as number))),
      avgWorkload: round(mean(feedbackRows.filter((f) => f.workload != null).map((f) => f.workload as number))),
      rows: feedbackRows,
    },
  };
}

// Strip student identity from feedback for professors.
function shapeForViewer(m: CourseMetrics, seeIdentities: boolean) {
  return {
    ...m,
    feedback: {
      ...m.feedback,
      rows: m.feedback.rows
        .filter((f) => f.comment)
        .map((f) => ({
          overall: f.overall,
          comment: f.comment,
          studentName: seeIdentities ? f.studentName : null,
        })),
    },
  };
}

// GET /analytics/course/:courseId
router.get("/analytics/course/:courseId", requireAuth, async (req: Request, res: Response) => {
  const courseId = Number(req.params.courseId);
  if (!Number.isInteger(courseId)) { res.status(400).json({ error: "Invalid course id" }); return; }
  const user = req.localUser!;
  const course = await getCourse(courseId);
  if (!course) { res.status(404).json({ error: "Course not found" }); return; }
  if (!canViewCourseAnalytics(course, user)) { res.status(403).json({ error: "Forbidden" }); return; }
  const m = await computeCourseMetrics(course);
  res.json(shapeForViewer(m, canSeeIdentities(user)));
});

// GET /analytics/program  (dean & coordinator: all courses + cohorts)
router.get("/analytics/program", requireAuth, async (req: Request, res: Response) => {
  const user = req.localUser!;
  const scope = await scopeCourseIds(user);
  if (scope === null) { res.status(403).json({ error: "Forbidden" }); return; }

  const courses = scope === "all"
    ? await db.select().from(coursesTable).where(eq(coursesTable.isActive, true))
    : (scope.length ? await db.select().from(coursesTable).where(inArray(coursesTable.id, scope)) : []);

  const teacherIds = Array.from(new Set(courses.map((c) => c.teacherId)));
  const teachers = teacherIds.length
    ? await db.select({ id: usersTable.id, name: usersTable.name }).from(usersTable).where(inArray(usersTable.id, teacherIds))
    : [];
  const teacherName = new Map(teachers.map((t) => [t.id, t.name]));

  const perCourse = [];
  const overallByStudentGlobal = new Map<string, number>();
  for (const c of courses) {
    const m = await computeCourseMetrics(c);
    perCourse.push({
      courseId: c.id,
      title: c.title,
      teacherName: teacherName.get(c.teacherId) ?? "—",
      enrolledCount: m.enrolledCount,
      avgScore: m.avgScore,
      onTimeRate: m.submissions.onTimeRate,
      pendingGrading: m.submissions.pending,
      atRiskCount: m.atRisk.length,
      attendanceRate: m.attendance.rate,
      active30: m.engagement.active30,
      feedbackAvg: m.feedback.avgOverall,
      feedbackCount: m.feedback.count,
    });
  }

  // Cohort comparison — dean & coordinator only (they see all courses/cohorts).
  const cohortRows: { cohortId: number; name: string; memberCount: number }[] = [];
  if (scope === "all") {
    const cohorts = await db.select().from(cohortsTable);
    for (const co of cohorts) {
      const members = await db.select({ studentId: cohortMembersTable.studentId }).from(cohortMembersTable).where(eq(cohortMembersTable.cohortId, co.id));
      cohortRows.push({ cohortId: co.id, name: co.name, memberCount: members.length });
    }
  }

  const totals = {
    courses: courses.length,
    students: perCourse.reduce((a, c) => a + c.enrolledCount, 0),
    atRisk: perCourse.reduce((a, c) => a + c.atRiskCount, 0),
    pendingGrading: perCourse.reduce((a, c) => a + c.pendingGrading, 0),
    avgScore: round(mean(perCourse.map((c) => c.avgScore).filter((x): x is number => x != null))),
    avgFeedback: round(mean(perCourse.map((c) => c.feedbackAvg).filter((x): x is number => x != null))),
  };
  void overallByStudentGlobal;

  res.json({ totals, courses: perCourse, cohorts: cohortRows });
});

/* -------- CSV export -------- */

function csvEscape(v: unknown): string {
  const s = v == null ? "" : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}
function toCsv(headers: string[], rows: (unknown[])[]): string {
  return [headers.map(csvEscape).join(","), ...rows.map((r) => r.map(csvEscape).join(","))].join("\n");
}
function sendCsv(res: Response, filename: string, csv: string) {
  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
  res.send(csv);
}

// GET /analytics/program/export.csv
router.get("/analytics/program/export.csv", requireAuth, async (req: Request, res: Response) => {
  const user = req.localUser!;
  const scope = await scopeCourseIds(user);
  if (scope === null) { res.status(403).json({ error: "Forbidden" }); return; }
  const courses = scope === "all"
    ? await db.select().from(coursesTable).where(eq(coursesTable.isActive, true))
    : (scope.length ? await db.select().from(coursesTable).where(inArray(coursesTable.id, scope)) : []);
  const teacherIds = Array.from(new Set(courses.map((c) => c.teacherId)));
  const teachers = teacherIds.length
    ? await db.select({ id: usersTable.id, name: usersTable.name }).from(usersTable).where(inArray(usersTable.id, teacherIds))
    : [];
  const teacherName = new Map(teachers.map((t) => [t.id, t.name]));

  const rows: unknown[][] = [];
  for (const c of courses) {
    const m = await computeCourseMetrics(c);
    rows.push([
      c.title, teacherName.get(c.teacherId) ?? "", m.enrolledCount, m.avgScore ?? "",
      m.submissions.onTimeRate ?? "", m.submissions.pending, m.atRisk.length,
      m.attendance.rate ?? "", m.engagement.active30, m.feedback.avgOverall ?? "", m.feedback.count,
    ]);
  }
  const csv = toCsv(
    ["Course", "Professor", "Students", "Avg score %", "On-time %", "Pending grading", "At risk", "Attendance %", "Active (30d)", "Avg rating", "Feedback count"],
    rows,
  );
  sendCsv(res, "dempo-program-analytics.csv", csv);
});

// GET /analytics/course/:courseId/export.csv  (per-student rows)
router.get("/analytics/course/:courseId/export.csv", requireAuth, async (req: Request, res: Response) => {
  const courseId = Number(req.params.courseId);
  if (!Number.isInteger(courseId)) { res.status(400).json({ error: "Invalid course id" }); return; }
  const user = req.localUser!;
  const course = await getCourse(courseId);
  if (!course) { res.status(404).json({ error: "Course not found" }); return; }
  if (!canViewCourseAnalytics(course, user)) { res.status(403).json({ error: "Forbidden" }); return; }

  const now = new Date();
  const d30 = new Date(now.getTime() - 30 * DAY);

  const students = await db
    .select({ id: usersTable.id, name: usersTable.name, email: usersTable.email })
    .from(enrollmentsTable)
    .innerJoin(usersTable, eq(usersTable.id, enrollmentsTable.studentId))
    .where(eq(enrollmentsTable.courseId, courseId))
    .orderBy(usersTable.name);
  const studentIds = students.map((s) => s.id);

  // per-student score
  const asgs = await db.select({ id: assignmentsTable.id, maxScore: assignmentsTable.maxScore }).from(assignmentsTable).where(eq(assignmentsTable.courseId, courseId));
  const asgById = new Map(asgs.map((a) => [a.id, a]));
  const asgIds = asgs.map((a) => a.id);
  const pctByStudent = new Map<string, number[]>();
  if (asgIds.length) {
    const subs = await db.select().from(submissionsTable).where(inArray(submissionsTable.assignmentId, asgIds));
    for (const s of subs) {
      const a = asgById.get(s.assignmentId);
      if (a && s.status === "graded" && s.score != null && a.maxScore) {
        const arr = pctByStudent.get(s.studentId) ?? []; arr.push((s.score / a.maxScore) * 100); pctByStudent.set(s.studentId, arr);
      }
    }
  }
  // attendance per student
  const att = await db.select({ studentId: attendanceTable.studentId, status: attendanceTable.status }).from(attendanceTable).where(eq(attendanceTable.courseId, courseId));
  const attByStudent = new Map<string, { present: number; total: number }>();
  for (const a of att) {
    const e = attByStudent.get(a.studentId) ?? { present: 0, total: 0 };
    e.total++; if (a.status === "present" || a.status === "late") e.present++;
    attByStudent.set(a.studentId, e);
  }
  // last active
  const lastActive = new Map<string, Date>();
  if (studentIds.length) {
    const logs = await db.select({ userId: activityLogsTable.userId, createdAt: activityLogsTable.createdAt })
      .from(activityLogsTable)
      .where(and(inArray(activityLogsTable.userId, studentIds), gte(activityLogsTable.createdAt, d30)));
    for (const l of logs) { if (!l.userId) continue; const t = new Date(l.createdAt); if (!lastActive.has(l.userId) || t > lastActive.get(l.userId)!) lastActive.set(l.userId, t); }
  }

  const rows = students.map((s) => {
    const arr = pctByStudent.get(s.id) ?? [];
    const a = attByStudent.get(s.id);
    const la = lastActive.get(s.id);
    return [
      s.name ?? "", s.email, arr.length ? Math.round(mean(arr)!) : "", arr.length,
      a && a.total ? Math.round((a.present / a.total) * 100) : "",
      la ? la.toISOString().slice(0, 10) : "over 30d ago",
    ];
  });
  const csv = toCsv(["Student", "Email", "Avg score %", "Graded items", "Attendance %", "Last active"], rows);
  sendCsv(res, `dempo-${course.title.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}-analytics.csv`, csv);
});

export default router;
