import { Router, type IRouter } from "express";
import { and, count, desc, eq, gte, ilike, lte, or, sql, type SQL } from "drizzle-orm";
import {
  db,
  activityLogsTable,
  usersTable,
  coursesTable,
  teacherInvitesTable,
  coordinatorCourseAssignmentsTable,
  enrollmentsTable,
  cohortMembersTable,
  invitesTable,
  appInvitesTable,
  courseMaterialReadsTable,
} from "@workspace/db";
import { inArray } from "drizzle-orm";
import {
  ListActivityLogsQueryParams,
  ListActivityLogsResponse,
  ListUsersResponse,
  AdminUpdateUserBody,
  ListTeacherInvitesResponse,
  CreateTeacherInviteBody,
  CreateTeacherInviteResponse,
  RemoveTeacherAccessResponse,
  ListCoordinatorAssignmentsResponse,
  SetCoordinatorCoursesBody,
  SetCoordinatorCoursesResponse,
} from "@workspace/api-zod";
import { requireAuth, requireAdmin } from "../middlewares/auth";
import { logActivity } from "../lib/activityLog";

const router: IRouter = Router();

router.get(
  "/admin/logs",
  requireAuth,
  requireAdmin,
  async (req, res): Promise<void> => {
    // The generated schema expects Date objects for from/to; coerce the
    // incoming query strings first.
    const rawQuery: Record<string, unknown> = { ...req.query };
    for (const key of ["from", "to"] as const) {
      if (typeof rawQuery[key] === "string" && rawQuery[key]) {
        const d = new Date(rawQuery[key] as string);
        if (!Number.isNaN(d.getTime())) rawQuery[key] = d;
      } else if (rawQuery[key] === "" || rawQuery[key] === undefined) {
        delete rawQuery[key];
      }
    }
    const parsed = ListActivityLogsQueryParams.safeParse(rawQuery);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }
    const { user, level, action, from, to } = parsed.data;
    const page = parsed.data.page ?? 1;
    const pageSize = parsed.data.pageSize ?? 25;

    const conditions: SQL[] = [];
    if (user) {
      const cond = or(
        eq(activityLogsTable.userId, user),
        ilike(activityLogsTable.userEmail, `%${user}%`),
      );
      if (cond) conditions.push(cond);
    }
    if (level) conditions.push(eq(activityLogsTable.level, level));
    if (action) conditions.push(ilike(activityLogsTable.action, `${action}%`));
    if (from) conditions.push(gte(activityLogsTable.createdAt, from));
    if (to) conditions.push(lte(activityLogsTable.createdAt, to));

    const where = conditions.length > 0 ? and(...conditions) : undefined;

    const [totalRow] = await db
      .select({ total: count() })
      .from(activityLogsTable)
      .where(where ?? sql`true`);

    const rows = await db
      .select({
        log: activityLogsTable,
        userName: usersTable.name,
      })
      .from(activityLogsTable)
      .leftJoin(usersTable, eq(activityLogsTable.userId, usersTable.id))
      .where(where ?? sql`true`)
      .orderBy(desc(activityLogsTable.createdAt), desc(activityLogsTable.id))
      .limit(pageSize)
      .offset((page - 1) * pageSize);

    res.json(
      ListActivityLogsResponse.parse({
        items: rows.map(({ log, userName }) => ({
          id: log.id,
          userId: log.userId,
          userEmail: log.userEmail,
          userName,
          level: log.level,
          action: log.action,
          message: log.message,
          metadata: log.metadata ?? null,
          createdAt: log.createdAt,
        })),
        total: totalRow?.total ?? 0,
        page,
        pageSize,
      }),
    );
  },
);

router.get(
  "/admin/users",
  requireAuth,
  requireAdmin,
  async (_req, res): Promise<void> => {
    const users = await db
      .select()
      .from(usersTable)
      .orderBy(desc(usersTable.createdAt));
    const courseCounts = await db
      .select({ teacherId: coursesTable.teacherId, total: count() })
      .from(coursesTable)
      .where(eq(coursesTable.isActive, true))
      .groupBy(coursesTable.teacherId);
    const countByTeacher = new Map(
      courseCounts.map((c) => [c.teacherId, c.total]),
    );
    res.json(
      ListUsersResponse.parse(
        users.map((u) => ({
          id: u.id,
          email: u.email,
          name: u.name,
          avatarUrl: u.avatarUrl,
          role: u.role,
          bio: u.bio,
          title: u.title,
          linkedinUrl: u.linkedinUrl,
          isAdmin: u.isAdmin,
          createdAt: u.createdAt,
          activeCourseCount: countByTeacher.get(u.id) ?? 0,
        })),
      ),
    );
  },
);

router.get(
  "/admin/teacher-invites",
  requireAuth,
  requireAdmin,
  async (_req, res): Promise<void> => {
    const invites = await db
      .select()
      .from(teacherInvitesTable)
      .orderBy(desc(teacherInvitesTable.createdAt));
    res.json(ListTeacherInvitesResponse.parse(invites));
  },
);

router.post(
  "/admin/teacher-invites",
  requireAuth,
  requireAdmin,
  async (req, res): Promise<void> => {
    const parsed = CreateTeacherInviteBody.safeParse(req.body);
    const email = parsed.success
      ? parsed.data.email.trim().toLowerCase()
      : "";
    if (!parsed.success || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      res.status(400).json({ error: "Enter a valid email address" });
      return;
    }

    const [existingUser] = await db
      .select()
      .from(usersTable)
      .where(sql`lower(${usersTable.email}) = ${email}`);
    if (existingUser) {
      res.status(409).json({
        error:
          existingUser.role === "teacher"
            ? "That person already has a teacher account"
            : "An account with that email already exists — change its role in the table below instead",
      });
      return;
    }

    const [existingInvite] = await db
      .select()
      .from(teacherInvitesTable)
      .where(eq(teacherInvitesTable.email, email));
    if (existingInvite) {
      res.status(409).json({ error: "A pending invite for that email already exists" });
      return;
    }

    const actor = req.localUser!;
    const [invite] = await db
      .insert(teacherInvitesTable)
      .values({
        email,
        createdBy: actor.id,
        createdByEmail: actor.email || null,
      })
      .returning();

    void logActivity({
      user: actor,
      action: "teacher.invite_created",
      message: `Admin ${actor.email} added ${email} as a pending teacher`,
      metadata: { inviteId: invite.id, email },
    });

    res.status(201).json(CreateTeacherInviteResponse.parse(invite));
  },
);

router.delete(
  "/admin/teacher-invites/:id",
  requireAuth,
  requireAdmin,
  async (req, res): Promise<void> => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      res.status(400).json({ error: "Invalid invite id" });
      return;
    }
    const [deleted] = await db
      .delete(teacherInvitesTable)
      .where(eq(teacherInvitesTable.id, id))
      .returning();
    if (!deleted) {
      res.status(404).json({ error: "Invite not found" });
      return;
    }
    const actor = req.localUser!;
    void logActivity({
      user: actor,
      action: "teacher.invite_revoked",
      message: `Admin ${actor.email} revoked the pending teacher invite for ${deleted.email}`,
      metadata: { inviteId: deleted.id, email: deleted.email },
    });
    res.status(204).end();
  },
);

router.get(
  "/admin/coordinator-assignments",
  requireAuth,
  requireAdmin,
  async (_req, res): Promise<void> => {
    const [assignments, courses, teachers] = await Promise.all([
      db.select().from(coordinatorCourseAssignmentsTable),
      db.select().from(coursesTable).where(eq(coursesTable.isActive, true)),
      db.select().from(usersTable),
    ]);
    const teacherById = new Map(teachers.map((t) => [t.id, t]));
    res.json(
      ListCoordinatorAssignmentsResponse.parse({
        assignments: assignments.map((a) => ({
          coordinatorId: a.coordinatorId,
          courseId: a.courseId,
        })),
        courses: courses.map((c) => ({
          id: c.id,
          title: c.title,
          teacherName: teacherById.get(c.teacherId)?.name ?? null,
        })),
      }),
    );
  },
);

router.put(
  "/admin/users/:id/coordinator-courses",
  requireAuth,
  requireAdmin,
  async (req, res): Promise<void> => {
    const targetId = req.params.id;
    if (typeof targetId !== "string" || !targetId) {
      res.status(400).json({ error: "Invalid user id" });
      return;
    }
    const parsed = SetCoordinatorCoursesBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }
    const [target] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.id, targetId));
    if (!target) {
      res.status(404).json({ error: "User not found" });
      return;
    }
    if (target.role !== "course_coordinator") {
      res.status(400).json({ error: "That user is not a course coordinator" });
      return;
    }

    const requestedIds = [...new Set(parsed.data.courseIds)];
    // Only allow assigning courses that actually exist.
    const validCourses = requestedIds.length
      ? await db
          .select({ id: coursesTable.id })
          .from(coursesTable)
          .where(inArray(coursesTable.id, requestedIds))
      : [];
    const validIds = validCourses.map((c) => c.id);
    if (validIds.length !== requestedIds.length) {
      res.status(400).json({ error: "One or more courses do not exist" });
      return;
    }

    const previous = await db
      .select()
      .from(coordinatorCourseAssignmentsTable)
      .where(eq(coordinatorCourseAssignmentsTable.coordinatorId, targetId));
    const previousIds = previous.map((a) => a.courseId);

    // Replace the assignment set.
    await db
      .delete(coordinatorCourseAssignmentsTable)
      .where(eq(coordinatorCourseAssignmentsTable.coordinatorId, targetId));
    if (validIds.length) {
      await db.insert(coordinatorCourseAssignmentsTable).values(
        validIds.map((courseId) => ({ coordinatorId: targetId, courseId })),
      );
    }

    const actor = req.localUser!;
    void logActivity({
      user: actor,
      action: "coordinator.courses_assigned",
      message: `Admin ${actor.email} set ${target.email}'s coordinated courses (${validIds.length} course${validIds.length === 1 ? "" : "s"})`,
      metadata: {
        targetUserId: targetId,
        targetEmail: target.email,
        previousCourseIds: previousIds,
        newCourseIds: validIds,
      },
    });

    res.json(SetCoordinatorCoursesResponse.parse({ courseIds: validIds }));
  },
);

router.post(
  "/admin/users/:id/remove-teacher",
  requireAuth,
  requireAdmin,
  async (req, res): Promise<void> => {
    const targetId = req.params.id;
    if (typeof targetId !== "string" || !targetId) {
      res.status(400).json({ error: "Invalid user id" });
      return;
    }
    if (targetId === req.userId) {
      res.status(400).json({ error: "You cannot remove your own teacher access" });
      return;
    }
    const [target] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.id, targetId));
    if (!target) {
      res.status(404).json({ error: "User not found" });
      return;
    }
    if (target.role !== "teacher") {
      res.status(400).json({ error: "That user is not a teacher" });
      return;
    }

    const deactivated = await db
      .update(coursesTable)
      .set({ isActive: false })
      .where(
        and(eq(coursesTable.teacherId, targetId), eq(coursesTable.isActive, true)),
      )
      .returning();

    const [updated] = await db
      .update(usersTable)
      .set({ role: "student" })
      .where(eq(usersTable.id, targetId))
      .returning();

    const actor = req.localUser!;
    void logActivity({
      user: actor,
      action: "teacher.access_removed",
      message: `Admin ${actor.email} removed teacher access from ${target.email} (${deactivated.length} course${deactivated.length === 1 ? "" : "s"} deactivated)`,
      metadata: {
        targetUserId: targetId,
        targetEmail: target.email,
        deactivatedCourseIds: deactivated.map((c) => c.id),
      },
    });

    res.json(
      RemoveTeacherAccessResponse.parse({
        user: {
          id: updated.id,
          email: updated.email,
          name: updated.name,
          avatarUrl: updated.avatarUrl,
          role: updated.role,
          bio: updated.bio,
          title: updated.title,
          linkedinUrl: updated.linkedinUrl,
          isAdmin: updated.isAdmin,
          createdAt: updated.createdAt,
          activeCourseCount: 0,
        },
        deactivatedCourses: deactivated.length,
      }),
    );
  },
);

router.patch(
  "/admin/users/:id",
  requireAuth,
  requireAdmin,
  async (req, res): Promise<void> => {
    const parsed = AdminUpdateUserBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }
    const { role, isAdmin } = parsed.data;
    if (role === undefined && isAdmin === undefined) {
      res.status(400).json({ error: "Nothing to update" });
      return;
    }

    const targetId = req.params.id;
    if (typeof targetId !== "string" || !targetId) {
      res.status(400).json({ error: "Invalid user id" });
      return;
    }
    const [target] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.id, targetId));
    if (!target) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    // Prevent an admin from revoking their own admin access.
    if (isAdmin === false && targetId === req.userId) {
      res.status(400).json({ error: "You cannot revoke your own admin access" });
      return;
    }

    // Removing teacher access has course-handling policy; route through the
    // dedicated endpoint (and never allow demoting yourself).
    if (target.role === "teacher" && role !== undefined && role !== "teacher") {
      if (targetId === req.userId) {
        res.status(400).json({ error: "You cannot remove your own teacher access" });
        return;
      }
      res.status(400).json({
        error:
          "Use the remove-teacher action so their courses are handled safely",
      });
      return;
    }

    const [updated] = await db
      .update(usersTable)
      .set({
        ...(role !== undefined ? { role } : {}),
        ...(isAdmin !== undefined ? { isAdmin } : {}),
      })
      .where(eq(usersTable.id, targetId))
      .returning();
    if (!updated) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    // A user who loses the coordinator role also loses their course
    // assignments so stale rows can't grant access if they're re-promoted.
    if (target.role === "course_coordinator" && role !== undefined && role !== "course_coordinator") {
      await db
        .delete(coordinatorCourseAssignmentsTable)
        .where(eq(coordinatorCourseAssignmentsTable.coordinatorId, targetId));
    }

    const actor = req.localUser;
    const changes: string[] = [];
    if (role !== undefined && role !== target.role) {
      changes.push(`role: ${target.role} → ${role}`);
    }
    if (isAdmin !== undefined && isAdmin !== target.isAdmin) {
      changes.push(isAdmin ? "admin granted" : "admin revoked");
    }
    if (changes.length > 0) {
      void logActivity({
        user: actor,
        action:
          isAdmin !== undefined && isAdmin !== target.isAdmin
            ? isAdmin
              ? "user.admin_granted"
              : "user.admin_revoked"
            : "user.role_changed",
        message: `Admin ${actor?.email ?? "unknown"} updated ${updated.email || updated.id} (${changes.join(", ")})`,
        metadata: {
          targetUserId: updated.id,
          targetEmail: updated.email,
          previousRole: target.role,
          newRole: updated.role,
          previousIsAdmin: target.isAdmin,
          newIsAdmin: updated.isAdmin,
        },
      });
    }

    res.json({
      id: updated.id,
      email: updated.email,
      name: updated.name,
      avatarUrl: updated.avatarUrl,
      role: updated.role,
      bio: updated.bio,
      title: updated.title,
      linkedinUrl: updated.linkedinUrl,
      isAdmin: updated.isAdmin,
      createdAt: updated.createdAt,
    });
  },
);

// DELETE /admin/users/:id — permanently remove a mistakenly-added account.
// Cleans up their enrollments, cohort memberships, roster + allow-list
// invites (so they can't rejoin), and material-read markers, then the user
// row. Their Clerk login is separate; removing the allow-list invite means a
// re-provision attempt is rejected as not-invited.
router.delete(
  "/admin/users/:id",
  requireAuth,
  requireAdmin,
  async (req, res): Promise<void> => {
    const targetId = req.params.id;
    if (typeof targetId !== "string" || !targetId) {
      res.status(400).json({ error: "Invalid user id" });
      return;
    }
    if (targetId === req.userId) {
      res.status(400).json({ error: "You cannot delete your own account" });
      return;
    }
    const [target] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.id, targetId));
    if (!target) {
      res.status(404).json({ error: "User not found" });
      return;
    }
    if (target.isAdmin) {
      res.status(400).json({ error: "Remove admin access before deleting this account" });
      return;
    }
    if (target.role === "teacher") {
      res.status(400).json({
        error: "Use the remove-teacher action first so their courses are handled safely",
      });
      return;
    }

    const email = (target.email ?? "").trim().toLowerCase();

    await db.transaction(async (tx) => {
      await tx.delete(enrollmentsTable).where(eq(enrollmentsTable.studentId, targetId));
      await tx.delete(cohortMembersTable).where(eq(cohortMembersTable.studentId, targetId));
      await tx.delete(courseMaterialReadsTable).where(eq(courseMaterialReadsTable.userId, targetId));
      await tx.delete(coordinatorCourseAssignmentsTable).where(eq(coordinatorCourseAssignmentsTable.coordinatorId, targetId));
      if (email) {
        await tx.delete(invitesTable).where(sql`lower(${invitesTable.email}) = ${email}`);
        await tx.delete(appInvitesTable).where(sql`lower(${appInvitesTable.email}) = ${email}`);
      }
      await tx.delete(usersTable).where(eq(usersTable.id, targetId));
    });

    const actor = req.localUser!;
    void logActivity({
      user: actor,
      action: "user.deleted",
      message: `Admin ${actor.email} deleted account ${target.email || targetId}`,
      metadata: { targetUserId: targetId, targetEmail: target.email, role: target.role },
    });

    res.status(204).end();
  },
);

export default router;
