import { Router, type IRouter } from "express";
import { z } from "zod";
import { eq, and, inArray, desc } from "drizzle-orm";
import {
  db,
  coursesTable,
  enrollmentsTable,
  invitesTable,
  usersTable,
  coursePlanItemsTable,
  cohortMembersTable,
} from "@workspace/db";
import {
  CreateCourseBody,
  CreateCourseResponse,
  JoinCourseBody,
  JoinCourseResponse,
  GetCourseParams,
  GetCourseResponse,
  ListCoursesResponse,
  ListCourseStudentsParams,
  ListCourseStudentsResponse,
  InviteStudentParams,
  InviteStudentBody,
  InviteStudentResponse,
  ListInvitesParams,
  ListInvitesResponse,
  RemoveInviteParams,
  RemoveCourseStudentParams,
  GetCoursePlanParams,
  GetCoursePlanResponse,
  UpdateCoursePlanParams,
  UpdateCoursePlanBody,
  UpdateCoursePlanResponse,
} from "@workspace/api-zod";
import { requireAuth } from "../middlewares/auth";
import { enrichCourse } from "../lib/serializers";
import { getCourse, isCourseTeacher, canAccessCourse, canViewCourse } from "../lib/authz";
import { logActivity } from "../lib/activityLog";

const router: IRouter = Router();

function generateInviteCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

router.get("/courses", requireAuth, async (req, res): Promise<void> => {
  const user = req.localUser!;
  let courses;
  if (user.role === "teacher") {
    courses = await db
      .select()
      .from(coursesTable)
      .where(eq(coursesTable.teacherId, user.id))
      .orderBy(desc(coursesTable.createdAt));
  } else {
    const enrollments = await db
      .select()
      .from(enrollmentsTable)
      .where(eq(enrollmentsTable.studentId, user.id));
    const courseIds = enrollments.map((e) => e.courseId);
    courses = courseIds.length
      ? await db
          .select()
          .from(coursesTable)
          .where(
            and(
              inArray(coursesTable.id, courseIds),
              eq(coursesTable.isActive, true),
            ),
          )
          .orderBy(desc(coursesTable.createdAt))
      : [];
  }

  const enriched = await Promise.all(courses.map(enrichCourse));
  res.json(ListCoursesResponse.parse(enriched));
});

router.post("/courses", requireAuth, async (req, res): Promise<void> => {
  if (req.localUser!.role !== "teacher") {
    res.status(403).json({ error: "Only professors can create courses" });
    return;
  }
  const parsed = CreateCourseBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  let inviteCode = generateInviteCode();
  // Ensure uniqueness (retry a few times on the rare collision).
  for (let i = 0; i < 5; i++) {
    const [existing] = await db
      .select()
      .from(coursesTable)
      .where(eq(coursesTable.inviteCode, inviteCode));
    if (!existing) break;
    inviteCode = generateInviteCode();
  }

  const [course] = await db
    .insert(coursesTable)
    .values({
      title: parsed.data.title,
      description: parsed.data.description ?? null,
      teacherId: req.userId!,
      inviteCode,
    })
    .returning();

  void logActivity({
    user: req.localUser!,
    action: "course.created",
    message: `${req.localUser!.email} created course "${course.title}"`,
    metadata: { courseId: course.id },
  });

  res.status(201).json(CreateCourseResponse.parse(await enrichCourse(course)));
});

// Inline (non-generated) course rename/edit — teacher-only. Kept out of the
// orval contract to avoid a regen; the web app calls it with a raw fetch.
const UpdateCourseInline = z.object({
  title: z.string().trim().min(1, "Title is required").max(160).optional(),
  description: z.string().trim().max(2000).nullable().optional(),
});

router.patch("/courses/:courseId", requireAuth, async (req, res): Promise<void> => {
  const courseId = Number(req.params.courseId);
  if (!Number.isInteger(courseId)) {
    res.status(400).json({ error: "Invalid course id" });
    return;
  }
  const course = await getCourse(courseId);
  if (!course) {
    res.status(404).json({ error: "Course not found" });
    return;
  }
  if (!isCourseTeacher(course, req.localUser!)) {
    res.status(403).json({ error: "Only the course teacher can edit this course" });
    return;
  }
  const parsed = UpdateCourseInline.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const patch: { title?: string; description?: string | null } = {};
  if (parsed.data.title !== undefined) patch.title = parsed.data.title;
  if (parsed.data.description !== undefined) patch.description = parsed.data.description;
  if (Object.keys(patch).length === 0) {
    res.status(400).json({ error: "Nothing to update" });
    return;
  }

  const [updated] = await db
    .update(coursesTable)
    .set(patch)
    .where(eq(coursesTable.id, courseId))
    .returning();

  void logActivity({
    user: req.localUser!,
    action: "course.updated",
    message: `${req.localUser!.email} edited course "${updated.title}"`,
    metadata: { courseId },
  });

  res.json(await enrichCourse(updated));
});

// Inline: platform student directory for a course's "Add students" panel.
// Returns every student with an `enrolled` flag for this course. Teacher-only
// (course owner). Kept out of the orval contract to avoid a regen.
router.get("/courses/:courseId/enroll-candidates", requireAuth, async (req, res): Promise<void> => {
  const courseId = Number(req.params.courseId);
  if (!Number.isInteger(courseId)) {
    res.status(400).json({ error: "Invalid course id" });
    return;
  }
  const course = await getCourse(courseId);
  if (!course) {
    res.status(404).json({ error: "Course not found" });
    return;
  }
  if (!isCourseTeacher(course, req.localUser!)) {
    res.status(403).json({ error: "Only the course teacher can view this" });
    return;
  }

  const enrolled = await db
    .select({ studentId: enrollmentsTable.studentId })
    .from(enrollmentsTable)
    .where(eq(enrollmentsTable.courseId, courseId));
  const enrolledIds = new Set(enrolled.map((e) => e.studentId));

  const students = await db
    .select({
      id: usersTable.id,
      name: usersTable.name,
      email: usersTable.email,
      avatarUrl: usersTable.avatarUrl,
    })
    .from(usersTable)
    .where(eq(usersTable.role, "student"))
    .orderBy(usersTable.name);

  res.json(
    students.map((s) => ({ ...s, enrolled: enrolledIds.has(s.id) })),
  );
});

// Inline: teacher directly enrolls one or more students into their course
// (no invite code needed on the student's side).
const EnrollBody = z.object({ studentIds: z.array(z.string().min(1)).min(1).max(500) });

router.post("/courses/:courseId/enroll", requireAuth, async (req, res): Promise<void> => {
  const courseId = Number(req.params.courseId);
  if (!Number.isInteger(courseId)) {
    res.status(400).json({ error: "Invalid course id" });
    return;
  }
  const course = await getCourse(courseId);
  if (!course) {
    res.status(404).json({ error: "Course not found" });
    return;
  }
  if (!isCourseTeacher(course, req.localUser!)) {
    res.status(403).json({ error: "Only the course teacher can add students" });
    return;
  }
  const parsed = EnrollBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  // Only enroll real students; ignore ids that aren't students.
  const ids = Array.from(new Set(parsed.data.studentIds));
  const validStudents = await db
    .select({ id: usersTable.id })
    .from(usersTable)
    .where(and(inArray(usersTable.id, ids), eq(usersTable.role, "student")));
  const validIds = new Set(validStudents.map((s) => s.id));

  const already = await db
    .select({ studentId: enrollmentsTable.studentId })
    .from(enrollmentsTable)
    .where(eq(enrollmentsTable.courseId, courseId));
  const alreadyIds = new Set(already.map((e) => e.studentId));

  const toInsert = ids
    .filter((id) => validIds.has(id) && !alreadyIds.has(id))
    .map((studentId) => ({ courseId, studentId }));

  if (toInsert.length) {
    await db.insert(enrollmentsTable).values(toInsert);
    void logActivity({
      user: req.localUser!,
      action: "course.enrolled",
      message: `${req.localUser!.email} enrolled ${toInsert.length} student(s) into "${course.title}"`,
      metadata: { courseId, count: toInsert.length },
    });
  }

  res.json({ enrolled: toInsert.length, skipped: ids.length - toInsert.length });
});

// Inline: enroll every member of a cohort into the course directly.
const EnrollCohortBody = z.object({ cohortId: z.number().int().positive() });

router.post("/courses/:courseId/enroll-cohort", requireAuth, async (req, res): Promise<void> => {
  const courseId = Number(req.params.courseId);
  if (!Number.isInteger(courseId)) {
    res.status(400).json({ error: "Invalid course id" });
    return;
  }
  const course = await getCourse(courseId);
  if (!course) {
    res.status(404).json({ error: "Course not found" });
    return;
  }
  if (!isCourseTeacher(course, req.localUser!)) {
    res.status(403).json({ error: "Only the course teacher can add students" });
    return;
  }
  const parsed = EnrollCohortBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const members = await db
    .select({ studentId: cohortMembersTable.studentId })
    .from(cohortMembersTable)
    .where(eq(cohortMembersTable.cohortId, parsed.data.cohortId));
  const memberIds = members.map((m) => m.studentId);
  if (memberIds.length === 0) {
    res.json({ enrolled: 0, skipped: 0 });
    return;
  }

  const already = await db
    .select({ studentId: enrollmentsTable.studentId })
    .from(enrollmentsTable)
    .where(eq(enrollmentsTable.courseId, courseId));
  const alreadyIds = new Set(already.map((e) => e.studentId));

  const toInsert = Array.from(new Set(memberIds))
    .filter((id) => !alreadyIds.has(id))
    .map((studentId) => ({ courseId, studentId }));

  if (toInsert.length) {
    await db.insert(enrollmentsTable).values(toInsert);
    void logActivity({
      user: req.localUser!,
      action: "course.enrolled_cohort",
      message: `${req.localUser!.email} enrolled a cohort (${toInsert.length}) into "${course.title}"`,
      metadata: { courseId, cohortId: parsed.data.cohortId, count: toInsert.length },
    });
  }

  res.json({ enrolled: toInsert.length, skipped: memberIds.length - toInsert.length });
});

router.post("/courses/join", requireAuth, async (req, res): Promise<void> => {
  const parsed = JoinCourseBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const joinerRole = req.localUser?.role;
  if (joinerRole === "dean" || joinerRole === "course_coordinator") {
    res.status(403).json({ error: "Oversight roles cannot join courses" });
    return;
  }

  const code = parsed.data.inviteCode.trim().toUpperCase();
  const [course] = await db
    .select()
    .from(coursesTable)
    .where(eq(coursesTable.inviteCode, code));

  if (!course || !course.isActive) {
    res.status(404).json({ error: "Invalid invite code" });
    return;
  }

  // Access to the platform is already invite-only (only admin-approved
  // emails can sign in), so a valid invite code is sufficient to join —
  // no separate per-course email roster is required.

  const [existing] = await db
    .select()
    .from(enrollmentsTable)
    .where(
      and(
        eq(enrollmentsTable.courseId, course.id),
        eq(enrollmentsTable.studentId, req.userId!),
      ),
    );

  if (!existing) {
    await db
      .insert(enrollmentsTable)
      .values({ courseId: course.id, studentId: req.userId! });
    void logActivity({
      user: req.localUser!,
      action: "course.joined",
      message: `${req.localUser!.email} joined course "${course.title}"`,
      metadata: { courseId: course.id },
    });
  }

  res.json(JoinCourseResponse.parse(await enrichCourse(course)));
});

router.get("/courses/:courseId", requireAuth, async (req, res): Promise<void> => {
  const params = GetCourseParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const course = await getCourse(params.data.courseId);
  if (!course) {
    res.status(404).json({ error: "Course not found" });
    return;
  }
  // Deans (global read-only) and assigned coordinators may view the course
  // page in addition to its members.
  if (!(await canViewCourse(course, req.localUser!))) {
    res.status(403).json({ error: "Not a member of this course" });
    return;
  }

  res.json(GetCourseResponse.parse(await enrichCourse(course)));
});

router.get(
  "/courses/:courseId/students",
  requireAuth,
  async (req, res): Promise<void> => {
    const params = ListCourseStudentsParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: params.error.message });
      return;
    }

    const course = await getCourse(params.data.courseId);
    if (!course) {
      res.status(404).json({ error: "Course not found" });
      return;
    }
    if (!(await canAccessCourse(course, req.localUser!))) {
      res.status(403).json({ error: "Not a member of this course" });
      return;
    }

    const enrollments = await db
      .select()
      .from(enrollmentsTable)
      .where(eq(enrollmentsTable.courseId, params.data.courseId));
    const studentIds = enrollments.map((e) => e.studentId);

    const students = studentIds.length
      ? await db
          .select()
          .from(usersTable)
          .where(inArray(usersTable.id, studentIds))
      : [];

    res.json(ListCourseStudentsResponse.parse(students));
  },
);

router.post(
  "/courses/:courseId/invite",
  requireAuth,
  async (req, res): Promise<void> => {
    const params = InviteStudentParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: params.error.message });
      return;
    }
    const parsed = InviteStudentBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }

    const course = await getCourse(params.data.courseId);
    if (!course) {
      res.status(404).json({ error: "Course not found" });
      return;
    }
    if (!isCourseTeacher(course, req.localUser!)) {
      res.status(403).json({ error: "Only the course professor can invite" });
      return;
    }

    const email = parsed.data.email.trim().toLowerCase();

    // Idempotent: return the existing roster entry if the email is already added.
    const [existing] = await db
      .select()
      .from(invitesTable)
      .where(
        and(
          eq(invitesTable.courseId, params.data.courseId),
          eq(invitesTable.email, email),
        ),
      );
    if (existing) {
      res.status(201).json(InviteStudentResponse.parse(existing));
      return;
    }

    const [invite] = await db
      .insert(invitesTable)
      .values({ courseId: params.data.courseId, email })
      .returning();

    res.status(201).json(InviteStudentResponse.parse(invite));
  },
);

router.get(
  "/courses/:courseId/invites",
  requireAuth,
  async (req, res): Promise<void> => {
    const params = ListInvitesParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: params.error.message });
      return;
    }

    const course = await getCourse(params.data.courseId);
    if (!course) {
      res.status(404).json({ error: "Course not found" });
      return;
    }
    if (!isCourseTeacher(course, req.localUser!)) {
      res.status(403).json({ error: "Only the course professor can view the roster" });
      return;
    }

    const invites = await db
      .select()
      .from(invitesTable)
      .where(eq(invitesTable.courseId, params.data.courseId))
      .orderBy(desc(invitesTable.createdAt));

    res.json(ListInvitesResponse.parse(invites));
  },
);

router.delete(
  "/courses/:courseId/invites/:inviteId",
  requireAuth,
  async (req, res): Promise<void> => {
    const params = RemoveInviteParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: params.error.message });
      return;
    }

    const course = await getCourse(params.data.courseId);
    if (!course) {
      res.status(404).json({ error: "Course not found" });
      return;
    }
    if (!isCourseTeacher(course, req.localUser!)) {
      res.status(403).json({ error: "Only the course professor can edit the roster" });
      return;
    }

    await db
      .delete(invitesTable)
      .where(
        and(
          eq(invitesTable.id, params.data.inviteId),
          eq(invitesTable.courseId, params.data.courseId),
        ),
      );

    res.status(204).end();
  },
);

router.delete(
  "/courses/:courseId/students/:studentId",
  requireAuth,
  async (req, res): Promise<void> => {
    const params = RemoveCourseStudentParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: params.error.message });
      return;
    }

    const course = await getCourse(params.data.courseId);
    if (!course) {
      res.status(404).json({ error: "Course not found" });
      return;
    }
    if (!isCourseTeacher(course, req.localUser!)) {
      res
        .status(403)
        .json({ error: "Only the course professor can remove students" });
      return;
    }

    const [enrollment] = await db
      .select()
      .from(enrollmentsTable)
      .where(
        and(
          eq(enrollmentsTable.courseId, params.data.courseId),
          eq(enrollmentsTable.studentId, params.data.studentId),
        ),
      );
    if (!enrollment) {
      res.status(404).json({ error: "Student is not enrolled in this course" });
      return;
    }

    const [student] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.id, params.data.studentId));
    const email = (student?.email ?? "").trim().toLowerCase();

    await db.transaction(async (tx) => {
      await tx
        .delete(enrollmentsTable)
        .where(
          and(
            eq(enrollmentsTable.courseId, params.data.courseId),
            eq(enrollmentsTable.studentId, params.data.studentId),
          ),
        );
      if (email) {
        const invites = await tx
          .select()
          .from(invitesTable)
          .where(eq(invitesTable.courseId, params.data.courseId));
        const matching = invites.filter(
          (invite) => invite.email.trim().toLowerCase() === email,
        );
        if (matching.length > 0) {
          await tx.delete(invitesTable).where(
            inArray(
              invitesTable.id,
              matching.map((i) => i.id),
            ),
          );
        }
      }
    });

    res.status(204).end();
  },
);

const DEFAULT_HOURS_PER_DAY = 5;

router.get(
  "/courses/:courseId/plan",
  requireAuth,
  async (req, res): Promise<void> => {
    const params = GetCoursePlanParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: params.error.message });
      return;
    }

    const course = await getCourse(params.data.courseId);
    if (!course) {
      res.status(404).json({ error: "Course not found" });
      return;
    }
    if (!(await canAccessCourse(course, req.localUser!))) {
      res.status(403).json({ error: "You are not a member of this course" });
      return;
    }

    const teacher = isCourseTeacher(course, req.localUser!);
    const hoursPerDay = course.planHoursPerDay ?? DEFAULT_HOURS_PER_DAY;
    const lockedDays = course.lockedPlanDays ?? [];
    const lockedSet = new Set(lockedDays);

    const rows = await db
      .select()
      .from(coursePlanItemsTable)
      .where(eq(coursePlanItemsTable.courseId, params.data.courseId));
    rows.sort((a, b) => a.hourNumber - b.hourNumber);

    const items = rows.map((row) => {
      const day = Math.ceil(row.hourNumber / hoursPerDay);
      const locked = !teacher && lockedSet.has(day);
      return {
        hourNumber: row.hourNumber,
        title: row.title,
        // Locked days: students see the outline (title) only.
        description: locked ? null : row.description,
        preWork: locked ? null : row.preWork,
        caseStudy: locked ? null : row.caseStudy,
        postWork: locked ? null : row.postWork,
        locked,
      };
    });

    res.json(
      GetCoursePlanResponse.parse({
        totalHours: course.planHours,
        hoursPerDay,
        lockedDays,
        items,
      }),
    );
  },
);

router.put(
  "/courses/:courseId/plan",
  requireAuth,
  async (req, res): Promise<void> => {
    const params = UpdateCoursePlanParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: params.error.message });
      return;
    }
    // Inline validation (not the generated body) so course duration can be any
    // whole number of 1-hour sessions — the generated contract forces multiples
    // of 5, which we intentionally bypass here.
    const PlanInputInline = z.object({
      totalHours: z.number().int().min(0).max(200),
      lockedDays: z.array(z.number().int()).optional(),
      items: z
        .array(
          z.object({
            hourNumber: z.number().int().positive(),
            title: z.string().trim().min(1),
            description: z.string().nullish(),
            preWork: z.string().nullish(),
            caseStudy: z.string().nullish(),
            postWork: z.string().nullish(),
          }),
        )
        .default([]),
    });
    const parsed = PlanInputInline.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }

    const course = await getCourse(params.data.courseId);
    if (!course) {
      res.status(404).json({ error: "Course not found" });
      return;
    }
    if (!isCourseTeacher(course, req.localUser!)) {
      res.status(403).json({ error: "Only the course professor can edit the plan" });
      return;
    }

    const hoursPerDay = course.planHoursPerDay ?? DEFAULT_HOURS_PER_DAY;
    const { totalHours, items } = parsed.data;
    const totalDays = Math.ceil(totalHours / hoursPerDay);
    const lockedDays = Array.from(
      new Set(
        (parsed.data.lockedDays ?? []).filter(
          (d) => d >= 1 && d <= totalDays,
        ),
      ),
    ).sort((a, b) => a - b);

    const seen = new Set<number>();
    for (const item of items) {
      if (item.hourNumber > totalHours) {
        res.status(400).json({
          error: `Hour ${item.hourNumber} is beyond the plan's ${totalHours} hours`,
        });
        return;
      }
      if (seen.has(item.hourNumber)) {
        res.status(400).json({ error: `Duplicate entry for hour ${item.hourNumber}` });
        return;
      }
      seen.add(item.hourNumber);
    }

    await db.transaction(async (tx) => {
      await tx
        .update(coursesTable)
        .set({ planHours: totalHours, lockedPlanDays: lockedDays })
        .where(eq(coursesTable.id, params.data.courseId));
      await tx
        .delete(coursePlanItemsTable)
        .where(eq(coursePlanItemsTable.courseId, params.data.courseId));
      if (items.length > 0) {
        await tx.insert(coursePlanItemsTable).values(
          items.map((item) => ({
            courseId: params.data.courseId,
            hourNumber: item.hourNumber,
            title: item.title,
            description: item.description ?? null,
            preWork: item.preWork ?? null,
            caseStudy: item.caseStudy ?? null,
            postWork: item.postWork ?? null,
          })),
        );
      }
    });

    res.json(
      UpdateCoursePlanResponse.parse({
        totalHours,
        hoursPerDay,
        lockedDays,
        items: items
          .slice()
          .sort((a, b) => a.hourNumber - b.hourNumber)
          .map((item) => ({
            hourNumber: item.hourNumber,
            title: item.title,
            description: item.description ?? null,
            preWork: item.preWork ?? null,
            caseStudy: item.caseStudy ?? null,
            postWork: item.postWork ?? null,
            locked: false,
          })),
      }),
    );
  },
);

export default router;
