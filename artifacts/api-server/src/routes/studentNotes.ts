import { Router, type IRouter, type Request, type Response } from "express";
import { z } from "zod";
import { and, desc, eq } from "drizzle-orm";
import { db, usersTable, studentNotesTable } from "@workspace/db";
import { requireAuth } from "../middlewares/auth";
import { getCourse, canAccessCourse } from "../lib/authz";

const router: IRouter = Router();

// GET a course's notes: mine (private + shared) and classmates' shared notes.
router.get("/courses/:courseId/notes", requireAuth, async (req: Request, res: Response) => {
  const courseId = Number(req.params.courseId);
  if (!Number.isInteger(courseId)) { res.status(400).json({ error: "Invalid course id" }); return; }
  const course = await getCourse(courseId);
  if (!course) { res.status(404).json({ error: "Course not found" }); return; }
  if (!(await canAccessCourse(course, req.localUser!))) { res.status(403).json({ error: "Forbidden" }); return; }

  const me = req.localUser!.id;
  const rows = await db
    .select({
      id: studentNotesTable.id, authorId: studentNotesTable.authorId, authorName: usersTable.name,
      title: studentNotesTable.title, body: studentNotesTable.body, tags: studentNotesTable.tags,
      shared: studentNotesTable.shared, createdAt: studentNotesTable.createdAt, updatedAt: studentNotesTable.updatedAt,
    })
    .from(studentNotesTable)
    .leftJoin(usersTable, eq(usersTable.id, studentNotesTable.authorId))
    .where(eq(studentNotesTable.courseId, courseId))
    .orderBy(desc(studentNotesTable.updatedAt));

  const mine = rows.filter((r) => r.authorId === me).map((r) => ({ ...r, authorName: r.authorName || "You", mine: true }));
  const shared = rows.filter((r) => r.authorId !== me && r.shared).map((r) => ({ ...r, authorName: r.authorName || "Classmate", mine: false }));
  res.json({ mine, shared });
});

const noteBody = z.object({
  title: z.string().trim().max(200).nullish(),
  body: z.string().trim().min(1).max(20000),
  tags: z.array(z.string().trim().max(40)).max(20).optional(),
  shared: z.boolean().optional(),
});

// POST a note (any course member).
router.post("/courses/:courseId/notes", requireAuth, async (req: Request, res: Response) => {
  const courseId = Number(req.params.courseId);
  if (!Number.isInteger(courseId)) { res.status(400).json({ error: "Invalid course id" }); return; }
  const course = await getCourse(courseId);
  if (!course) { res.status(404).json({ error: "Course not found" }); return; }
  if (!(await canAccessCourse(course, req.localUser!))) { res.status(403).json({ error: "Forbidden" }); return; }
  const parsed = noteBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const [row] = await db
    .insert(studentNotesTable)
    .values({ courseId, authorId: req.localUser!.id, title: parsed.data.title ?? null, body: parsed.data.body, tags: parsed.data.tags ?? [], shared: parsed.data.shared ?? false })
    .returning();
  res.status(201).json(row);
});

// PATCH / DELETE a note (author only).
router.patch("/notes/:id", requireAuth, async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  const [existing] = await db.select().from(studentNotesTable).where(eq(studentNotesTable.id, id));
  if (!existing || existing.authorId !== req.localUser!.id) { res.status(404).json({ error: "Note not found" }); return; }
  const parsed = noteBody.partial().safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const d = parsed.data;
  const patch: Record<string, unknown> = { updatedAt: new Date() };
  if (d.title !== undefined) patch.title = d.title ?? null;
  if (d.body !== undefined) patch.body = d.body;
  if (d.tags !== undefined) patch.tags = d.tags;
  if (d.shared !== undefined) patch.shared = d.shared;
  const [row] = await db.update(studentNotesTable).set(patch).where(eq(studentNotesTable.id, id)).returning();
  res.json(row);
});

router.delete("/notes/:id", requireAuth, async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  const [existing] = await db.select().from(studentNotesTable).where(eq(studentNotesTable.id, id));
  if (!existing || existing.authorId !== req.localUser!.id) { res.status(404).json({ error: "Note not found" }); return; }
  await db.delete(studentNotesTable).where(eq(studentNotesTable.id, id));
  res.json({ ok: true });
});

export default router;
