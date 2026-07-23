import { Router, type IRouter, type Request, type Response } from "express";
import { z } from "zod";
import { eq } from "drizzle-orm";
import {
  db,
  assignmentsTable,
  submissionsTable,
  assignmentRubricsTable,
  submissionRubricScoresTable,
} from "@workspace/db";
import { requireAuth } from "../middlewares/auth";
import { getCourse, isCourseTeacher, canAccessCourse } from "../lib/authz";

const router: IRouter = Router();

const criteriaSchema = z.array(
  z.object({
    name: z.string().trim().min(1).max(120),
    description: z.string().trim().max(1000).optional(),
    maxPoints: z.number().min(0).max(1000),
  }),
).max(30);

async function assignmentCourse(assignmentId: number) {
  const [a] = await db.select().from(assignmentsTable).where(eq(assignmentsTable.id, assignmentId));
  if (!a) return null;
  const course = await getCourse(a.courseId);
  return course ? { assignment: a, course } : null;
}

// GET assignment rubric (course members)
router.get("/assignments/:assignmentId/rubric", requireAuth, async (req: Request, res: Response) => {
  const assignmentId = Number(req.params.assignmentId);
  if (!Number.isInteger(assignmentId)) { res.status(400).json({ error: "Invalid id" }); return; }
  const ctx = await assignmentCourse(assignmentId);
  if (!ctx) { res.status(404).json({ error: "Assignment not found" }); return; }
  if (!(await canAccessCourse(ctx.course, req.localUser!))) { res.status(403).json({ error: "Forbidden" }); return; }
  const [row] = await db.select().from(assignmentRubricsTable).where(eq(assignmentRubricsTable.assignmentId, assignmentId));
  res.json({ criteria: row?.criteria ?? [], maxScore: ctx.assignment.maxScore });
});

// PUT assignment rubric (course teacher)
router.put("/assignments/:assignmentId/rubric", requireAuth, async (req: Request, res: Response) => {
  const assignmentId = Number(req.params.assignmentId);
  if (!Number.isInteger(assignmentId)) { res.status(400).json({ error: "Invalid id" }); return; }
  const ctx = await assignmentCourse(assignmentId);
  if (!ctx) { res.status(404).json({ error: "Assignment not found" }); return; }
  if (!isCourseTeacher(ctx.course, req.localUser!)) { res.status(403).json({ error: "Only the course teacher can edit the rubric" }); return; }
  const parsed = z.object({ criteria: criteriaSchema }).safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  await db
    .insert(assignmentRubricsTable)
    .values({ assignmentId, criteria: parsed.data.criteria })
    .onConflictDoUpdate({ target: [assignmentRubricsTable.assignmentId], set: { criteria: parsed.data.criteria, updatedAt: new Date() } });
  res.json({ ok: true });
});

async function submissionCtx(submissionId: number) {
  const [s] = await db.select().from(submissionsTable).where(eq(submissionsTable.id, submissionId));
  if (!s) return null;
  const ctx = await assignmentCourse(s.assignmentId);
  return ctx ? { submission: s, ...ctx } : null;
}

// GET submission rubric scores + the assignment's criteria (teacher or student owner)
router.get("/submissions/:submissionId/rubric", requireAuth, async (req: Request, res: Response) => {
  const submissionId = Number(req.params.submissionId);
  if (!Number.isInteger(submissionId)) { res.status(400).json({ error: "Invalid id" }); return; }
  const ctx = await submissionCtx(submissionId);
  if (!ctx) { res.status(404).json({ error: "Submission not found" }); return; }
  const user = req.localUser!;
  const isOwner = ctx.submission.studentId === user.id;
  if (!isOwner && !isCourseTeacher(ctx.course, user) && !(await canAccessCourse(ctx.course, user))) {
    res.status(403).json({ error: "Forbidden" }); return;
  }
  const [rubric] = await db.select().from(assignmentRubricsTable).where(eq(assignmentRubricsTable.assignmentId, ctx.assignment.id));
  const [scores] = await db.select().from(submissionRubricScoresTable).where(eq(submissionRubricScoresTable.submissionId, submissionId));
  res.json({ criteria: rubric?.criteria ?? [], scores: scores?.scores ?? [], maxScore: ctx.assignment.maxScore });
});

// PUT submission rubric scores (teacher). Stores per-criterion marks; the total
// score is applied via the existing grade endpoint by the client.
router.put("/submissions/:submissionId/rubric", requireAuth, async (req: Request, res: Response) => {
  const submissionId = Number(req.params.submissionId);
  if (!Number.isInteger(submissionId)) { res.status(400).json({ error: "Invalid id" }); return; }
  const ctx = await submissionCtx(submissionId);
  if (!ctx) { res.status(404).json({ error: "Submission not found" }); return; }
  if (!isCourseTeacher(ctx.course, req.localUser!)) { res.status(403).json({ error: "Only the course teacher can grade" }); return; }
  const parsed = z.object({ scores: z.array(z.object({ name: z.string(), points: z.number().min(0) })).max(30) }).safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  await db
    .insert(submissionRubricScoresTable)
    .values({ submissionId, scores: parsed.data.scores })
    .onConflictDoUpdate({ target: [submissionRubricScoresTable.submissionId], set: { scores: parsed.data.scores, updatedAt: new Date() } });
  res.json({ ok: true });
});

export default router;
