import { Router, type IRouter } from "express";
import { eq, and, count, desc, inArray } from "drizzle-orm";
import {
  db,
  assignmentsTable,
  submissionsTable,
  submissionSimilaritiesTable,
  submissionMemberGradesTable,
  submissionRubricScoresTable,
  assignmentRubricsTable,
  assignmentTargetsTable,
  assignmentGroupsTable,
  groupTasksTable,
  gradeItemCategoriesTable,
  courseGroupsTable,
  courseGroupMembersTable,
  enrollmentsTable,
  usersTable,
} from "@workspace/db";
import {
  ListAssignmentsParams,
  ListAssignmentsResponse,
  CreateAssignmentParams,
  CreateAssignmentBody,
  CreateAssignmentResponse,
  GetAssignmentParams,
  GetAssignmentResponse,
  UpdateAssignmentParams,
  UpdateAssignmentBody,
  UpdateAssignmentResponse,
} from "@workspace/api-zod";
import { requireAuth } from "../middlewares/auth";
import {
  getCourse,
  canAccessCourse,
  isCourseTeacher,
  getTargetsByAssignment,
  getGroupTargetsByAssignment,
  getStudentGroupIds,
  getStudentGroupForAssignment,
  isAssignmentTargetedAt,
} from "../lib/authz";
import { serializeGroup } from "./groups";
import { logActivity } from "../lib/activityLog";
import { ObjectStorageService } from "../lib/objectStorage";
import {
  notifyCourseStudents,
  createNotifications,
} from "../lib/notifications";

const router: IRouter = Router();

router.get(
  "/courses/:courseId/assignments",
  requireAuth,
  async (req, res): Promise<void> => {
    const params = ListAssignmentsParams.safeParse(req.params);
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

    const isTeacher = isCourseTeacher(course, req.localUser!);

    const allAssignments = await db
      .select()
      .from(assignmentsTable)
      .where(eq(assignmentsTable.courseId, params.data.courseId))
      .orderBy(desc(assignmentsTable.createdAt));

    const assignmentIds = allAssignments.map((a) => a.id);
    const [targetsByAssignment, groupTargetsByAssignment, myGroupIds] =
      await Promise.all([
        getTargetsByAssignment(assignmentIds),
        getGroupTargetsByAssignment(assignmentIds),
        getStudentGroupIds(req.userId!),
      ]);

    // Students only see assignments targeted at them: group assignments only
    // when they're in a targeted group; individual ones per target rows
    // (no rows = everyone).
    const assignments = isTeacher
      ? allAssignments
      : allAssignments.filter((a) => {
          const groupIds = groupTargetsByAssignment.get(a.id);
          if (groupIds && groupIds.length > 0) {
            return groupIds.some((g) => myGroupIds.has(g));
          }
          const targets = targetsByAssignment.get(a.id);
          return !targets || targets.includes(req.userId!);
        });

    // Teacher-only: resolve target student details for display.
    const allTargetIds = isTeacher
      ? [...new Set([...targetsByAssignment.values()].flat())]
      : [];
    const targetUsers = allTargetIds.length
      ? await db
          .select()
          .from(usersTable)
          .where(inArray(usersTable.id, allTargetIds))
      : [];
    const userById = new Map(targetUsers.map((u) => [u.id, u]));

    // Teacher-only: resolve targeted group details for display.
    const allGroupIds = isTeacher
      ? [...new Set([...groupTargetsByAssignment.values()].flat())]
      : [];
    const targetGroups = allGroupIds.length
      ? await db
          .select()
          .from(courseGroupsTable)
          .where(inArray(courseGroupsTable.id, allGroupIds))
      : [];
    const serializedGroupById = new Map(
      await Promise.all(
        targetGroups.map(
          async (g) => [g.id, await serializeGroup(g)] as const,
        ),
      ),
    );

    // Student: serialize the viewer's own groups once for `myGroup` context.
    const serializedMyGroups = new Map<
      number,
      Awaited<ReturnType<typeof serializeGroup>>
    >();
    if (!isTeacher && myGroupIds.size > 0) {
      const myGroups = await db
        .select()
        .from(courseGroupsTable)
        .where(inArray(courseGroupsTable.id, [...myGroupIds]));
      for (const g of myGroups) {
        serializedMyGroups.set(g.id, await serializeGroup(g));
      }
    }

    const enriched = await Promise.all(
      assignments.map(async (a) => {
        const targets = targetsByAssignment.get(a.id);
        const groupIds = groupTargetsByAssignment.get(a.id);
        const isGroup = !!groupIds && groupIds.length > 0;
        // For group assignments, "my submission" is the group's shared one.
        const myGroupId = isGroup
          ? (groupIds!.find((g) => myGroupIds.has(g)) ?? null)
          : null;
        const [[{ value: submissionCount }], [mine]] = await Promise.all([
          db
            .select({ value: count() })
            .from(submissionsTable)
            .where(eq(submissionsTable.assignmentId, a.id)),
          myGroupId != null
            ? db
                .select()
                .from(submissionsTable)
                .where(
                  and(
                    eq(submissionsTable.assignmentId, a.id),
                    eq(submissionsTable.groupId, myGroupId),
                  ),
                )
            : db
                .select()
                .from(submissionsTable)
                .where(
                  and(
                    eq(submissionsTable.assignmentId, a.id),
                    eq(submissionsTable.studentId, req.userId!),
                  ),
                ),
        ]);
        return {
          ...a,
          submissionCount,
          mySubmissionId: mine?.id ?? null,
          mySubmissionStatus: mine?.status ?? null,
          ...(isTeacher && isGroup
            ? {
                targetGroupIds: groupIds,
                targetGroups: groupIds!
                  .map((g) => serializedGroupById.get(g))
                  .filter(Boolean),
              }
            : {}),
          ...(isTeacher
            ? {
                targetStudentIds: targets ?? null,
                targetStudents: targets
                  ? targets.map((id) => ({
                      id,
                      name: userById.get(id)?.name ?? null,
                      email: userById.get(id)?.email ?? null,
                    }))
                  : null,
              }
            : {}),
          ...(!isTeacher && myGroupId != null
            ? { myGroup: serializedMyGroups.get(myGroupId) ?? null }
            : {}),
        };
      }),
    );

    res.json(ListAssignmentsResponse.parse(enriched));
  },
);

router.post(
  "/courses/:courseId/assignments",
  requireAuth,
  async (req, res): Promise<void> => {
    const params = CreateAssignmentParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: params.error.message });
      return;
    }
    const parsed = CreateAssignmentBody.safeParse(req.body);
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
      res.status(403).json({ error: "Only the course professor can add assignments" });
      return;
    }

    const attachments = parsed.data.attachments ?? [];
    const validPath = /^\/objects\/[A-Za-z0-9._-]+(\/[A-Za-z0-9._-]+)*$/;
    for (const file of attachments) {
      if (!validPath.test(file.path) || file.path.includes("..")) {
        res.status(400).json({ error: "Invalid attachment path" });
        return;
      }
    }

    // Group assignments: validate targeted groups belong to this course.
    const assignmentType =
      parsed.data.assignmentType === "group" ? "group" : "individual";
    const targetGroupIds =
      assignmentType === "group"
        ? [...new Set(parsed.data.targetGroupIds ?? [])]
        : [];
    if (assignmentType === "group") {
      if (targetGroupIds.length === 0) {
        res
          .status(400)
          .json({ error: "Pick at least one group for a group assignment" });
        return;
      }
      const groups = await db
        .select()
        .from(courseGroupsTable)
        .where(
          and(
            eq(courseGroupsTable.courseId, params.data.courseId),
            inArray(courseGroupsTable.id, targetGroupIds),
          ),
        );
      if (groups.length !== targetGroupIds.length) {
        res
          .status(400)
          .json({ error: "Some targeted groups do not belong to this course" });
        return;
      }
    }

    // Validate optional per-student targeting: every id must be enrolled.
    const targetStudentIds =
      assignmentType === "group"
        ? []
        : [...new Set(parsed.data.targetStudentIds ?? [])];
    if (targetStudentIds.length > 0) {
      const enrolled = await db
        .select()
        .from(enrollmentsTable)
        .where(
          and(
            eq(enrollmentsTable.courseId, params.data.courseId),
            inArray(enrollmentsTable.studentId, targetStudentIds),
          ),
        );
      const enrolledIds = new Set(enrolled.map((e) => e.studentId));
      const notEnrolled = targetStudentIds.filter((id) => !enrolledIds.has(id));
      if (notEnrolled.length > 0) {
        res.status(400).json({
          error: "Some targeted students are not enrolled in this course",
        });
        return;
      }
    }

    const [assignment] = await db
      .insert(assignmentsTable)
      .values({
        courseId: params.data.courseId,
        title: parsed.data.title,
        description: parsed.data.description ?? null,
        dueDate: parsed.data.dueDate ? new Date(parsed.data.dueDate) : null,
        allowedTypes: parsed.data.allowedTypes,
        maxScore: parsed.data.maxScore ?? 100,
        attachments,
        assignmentType,
        leaderOnlySubmit:
          assignmentType === "group" ? !!parsed.data.leaderOnlySubmit : false,
      })
      .returning();

    if (targetStudentIds.length > 0) {
      await db.insert(assignmentTargetsTable).values(
        targetStudentIds.map((studentId) => ({
          assignmentId: assignment.id,
          studentId,
        })),
      );
    }
    if (targetGroupIds.length > 0) {
      await db.insert(assignmentGroupsTable).values(
        targetGroupIds.map((groupId) => ({
          assignmentId: assignment.id,
          groupId,
        })),
      );
    }

    void logActivity({
      user: req.localUser!,
      action: "assignment.created",
      message: `${req.localUser!.email} created assignment "${assignment.title}" in course "${course.title}"`,
      metadata: { assignmentId: assignment.id, courseId: course.id },
    });

    const notification = {
      type: "assignment.created",
      title: `New assignment: ${assignment.title}`,
      body: `Posted in ${course.title}${assignment.dueDate ? ` — due ${assignment.dueDate.toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short", timeZone: "UTC" })} UTC` : ""}`,
      link: `/assignment/${assignment.id}`,
      refId: assignment.id,
    };
    if (targetGroupIds.length > 0) {
      const members = await db
        .select()
        .from(courseGroupMembersTable)
        .where(inArray(courseGroupMembersTable.groupId, targetGroupIds));
      const memberIds = [...new Set(members.map((m) => m.studentId))];
      void createNotifications(
        memberIds.map((userId) => ({
          ...notification,
          userId,
          courseId: course.id,
        })),
      );
    } else if (targetStudentIds.length > 0) {
      void createNotifications(
        targetStudentIds.map((userId) => ({
          ...notification,
          userId,
          courseId: course.id,
        })),
      );
    } else {
      void notifyCourseStudents(course.id, notification);
    }

    res.status(201).json(CreateAssignmentResponse.parse(assignment));
  },
);

router.get(
  "/assignments/:assignmentId",
  requireAuth,
  async (req, res): Promise<void> => {
    const params = GetAssignmentParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: params.error.message });
      return;
    }

    const [assignment] = await db
      .select()
      .from(assignmentsTable)
      .where(eq(assignmentsTable.id, params.data.assignmentId));

    if (!assignment) {
      res.status(404).json({ error: "Assignment not found" });
      return;
    }

    const course = await getCourse(assignment.courseId);
    if (!course || !(await canAccessCourse(course, req.localUser!))) {
      res.status(403).json({ error: "Not a member of this course" });
      return;
    }

    const isTeacher = isCourseTeacher(course, req.localUser!);

    // Non-targeted students must not learn the assignment exists.
    if (
      !isTeacher &&
      !(await isAssignmentTargetedAt(assignment.id, req.userId!))
    ) {
      res.status(404).json({ error: "Assignment not found" });
      return;
    }

    if (isTeacher) {
      const [targetsByAssignment, groupTargetsByAssignment] = await Promise.all([
        getTargetsByAssignment([assignment.id]),
        getGroupTargetsByAssignment([assignment.id]),
      ]);
      const targets = targetsByAssignment.get(assignment.id);
      const groupIds = groupTargetsByAssignment.get(assignment.id);
      const targetUsers = targets?.length
        ? await db
            .select()
            .from(usersTable)
            .where(inArray(usersTable.id, targets))
        : [];
      const userById = new Map(targetUsers.map((u) => [u.id, u]));
      const groups = groupIds?.length
        ? await db
            .select()
            .from(courseGroupsTable)
            .where(inArray(courseGroupsTable.id, groupIds))
        : [];
      res.json(
        GetAssignmentResponse.parse({
          ...assignment,
          targetStudentIds: targets ?? null,
          targetStudents: targets
            ? targets.map((id) => ({
                id,
                name: userById.get(id)?.name ?? null,
                email: userById.get(id)?.email ?? null,
              }))
            : null,
          targetGroupIds: groupIds ?? null,
          targetGroups: groups.length
            ? await Promise.all(groups.map(serializeGroup))
            : null,
        }),
      );
      return;
    }

    // Student view: include group context and the shared submission status
    // for group assignments.
    if (assignment.assignmentType === "group") {
      const mine = await getStudentGroupForAssignment(
        assignment.id,
        req.userId!,
      );
      const [groupSubmission] = mine
        ? await db
            .select()
            .from(submissionsTable)
            .where(
              and(
                eq(submissionsTable.assignmentId, assignment.id),
                eq(submissionsTable.groupId, mine.group.id),
              ),
            )
        : [];
      res.json(
        GetAssignmentResponse.parse({
          ...assignment,
          myGroup: mine ? await serializeGroup(mine.group) : null,
          mySubmissionId: groupSubmission?.id ?? null,
          mySubmissionStatus: groupSubmission?.status ?? null,
        }),
      );
      return;
    }

    const [mySubmission] = await db
      .select()
      .from(submissionsTable)
      .where(
        and(
          eq(submissionsTable.assignmentId, assignment.id),
          eq(submissionsTable.studentId, req.userId!),
        ),
      );
    res.json(
      GetAssignmentResponse.parse({
        ...assignment,
        mySubmissionId: mySubmission?.id ?? null,
        mySubmissionStatus: mySubmission?.status ?? null,
      }),
    );
  },
);

router.patch(
  "/assignments/:assignmentId",
  requireAuth,
  async (req, res): Promise<void> => {
    const params = UpdateAssignmentParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: params.error.message });
      return;
    }
    const parsed = UpdateAssignmentBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }

    const [existing] = await db
      .select()
      .from(assignmentsTable)
      .where(eq(assignmentsTable.id, params.data.assignmentId));
    if (!existing) {
      res.status(404).json({ error: "Assignment not found" });
      return;
    }

    const course = await getCourse(existing.courseId);
    if (!course || !isCourseTeacher(course, req.localUser!)) {
      res
        .status(403)
        .json({ error: "Only the course teacher can edit assignments" });
      return;
    }

    if (parsed.data.attachments) {
      const validPath = /^\/objects\/[A-Za-z0-9._-]+(\/[A-Za-z0-9._-]+)*$/;
      for (const file of parsed.data.attachments) {
        if (!validPath.test(file.path) || file.path.includes("..")) {
          res.status(400).json({ error: "Invalid attachment path" });
          return;
        }
      }
    }

    // Validate targeting: every id must be enrolled in the course.
    const targetStudentIds =
      parsed.data.targetStudentIds !== undefined
        ? [...new Set(parsed.data.targetStudentIds)]
        : undefined;
    if (targetStudentIds && targetStudentIds.length > 0) {
      const enrolled = await db
        .select()
        .from(enrollmentsTable)
        .where(
          and(
            eq(enrollmentsTable.courseId, existing.courseId),
            inArray(enrollmentsTable.studentId, targetStudentIds),
          ),
        );
      const enrolledIds = new Set(enrolled.map((e) => e.studentId));
      const notEnrolled = targetStudentIds.filter((id) => !enrolledIds.has(id));
      if (notEnrolled.length > 0) {
        res.status(400).json({
          error: "Some targeted students are not enrolled in this course",
        });
        return;
      }
    }

    const updates: Partial<typeof assignmentsTable.$inferInsert> = {};
    if (parsed.data.title !== undefined) updates.title = parsed.data.title;
    if (parsed.data.description !== undefined)
      updates.description = parsed.data.description ?? null;
    if (parsed.data.dueDate !== undefined)
      updates.dueDate = parsed.data.dueDate
        ? new Date(parsed.data.dueDate)
        : null;
    if (parsed.data.allowedTypes !== undefined)
      updates.allowedTypes = parsed.data.allowedTypes;
    if (parsed.data.maxScore !== undefined)
      updates.maxScore = parsed.data.maxScore;
    if (parsed.data.attachments !== undefined)
      updates.attachments = parsed.data.attachments;

    const [assignment] = Object.keys(updates).length
      ? await db
          .update(assignmentsTable)
          .set(updates)
          .where(eq(assignmentsTable.id, existing.id))
          .returning()
      : [existing];

    // Replace targeting rows when the audience was provided.
    // Note: students who already submitted keep their submissions; the teacher
    // still sees those submissions in the grading queue even if the student is
    // no longer targeted.
    let previousTargets: string[] | undefined;
    if (targetStudentIds !== undefined) {
      previousTargets =
        (await getTargetsByAssignment([existing.id])).get(existing.id) ?? [];
      await db
        .delete(assignmentTargetsTable)
        .where(eq(assignmentTargetsTable.assignmentId, existing.id));
      if (targetStudentIds.length > 0) {
        await db.insert(assignmentTargetsTable).values(
          targetStudentIds.map((studentId) => ({
            assignmentId: existing.id,
            studentId,
          })),
        );
      }
    }

    void logActivity({
      user: req.localUser!,
      action: "assignment.updated",
      message: `${req.localUser!.email} updated assignment "${assignment.title}" in course "${course.title}"`,
      metadata: { assignmentId: assignment.id, courseId: course.id },
    });

    // Notify students newly added to the audience.
    if (targetStudentIds !== undefined) {
      const prev = new Set(previousTargets);
      const notification = {
        type: "assignment.created",
        title: `New assignment: ${assignment.title}`,
        body: `Posted in ${course.title}${assignment.dueDate ? ` — due ${assignment.dueDate.toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short", timeZone: "UTC" })} UTC` : ""}`,
        link: `/assignment/${assignment.id}`,
        refId: assignment.id,
      };
      if (targetStudentIds.length > 0) {
        // Was "all students" before? Then everyone already saw it — only
        // notify if it was previously targeted and these ids are new.
        if (prev.size > 0) {
          const newlyAdded = targetStudentIds.filter((id) => !prev.has(id));
          if (newlyAdded.length > 0) {
            void createNotifications(
              newlyAdded.map((userId) => ({
                ...notification,
                userId,
                courseId: course.id,
              })),
            );
          }
        }
      } else if (prev.size > 0) {
        // Opened up from targeted to all students: notify previously
        // untargeted students via the course-wide path, excluding those who
        // were already targeted.
        const enrolled = await db
          .select()
          .from(enrollmentsTable)
          .where(eq(enrollmentsTable.courseId, course.id));
        const newlyAdded = enrolled
          .map((e) => e.studentId)
          .filter((id) => !prev.has(id));
        if (newlyAdded.length > 0) {
          void createNotifications(
            newlyAdded.map((userId) => ({
              ...notification,
              userId,
              courseId: course.id,
            })),
          );
        }
      }
    }

    // Teacher response includes resolved target details.
    const finalTargets =
      targetStudentIds !== undefined
        ? targetStudentIds.length > 0
          ? targetStudentIds
          : null
        : ((await getTargetsByAssignment([existing.id])).get(existing.id) ??
          null);
    const targetUsers = finalTargets?.length
      ? await db
          .select()
          .from(usersTable)
          .where(inArray(usersTable.id, finalTargets))
      : [];
    const userById = new Map(targetUsers.map((u) => [u.id, u]));

    res.json(
      UpdateAssignmentResponse.parse({
        ...assignment,
        targetStudentIds: finalTargets,
        targetStudents: finalTargets
          ? finalTargets.map((id) => ({
              id,
              name: userById.get(id)?.name ?? null,
              email: userById.get(id)?.email ?? null,
            }))
          : null,
      }),
    );
  },
);

// DELETE an assignment and every record tied to it (teacher only). Removes
// submissions and their per-member grades / rubric marks / similarity rows,
// group targeting + task breakdowns, targeting rows, the rubric, and the
// gradebook category mapping — then best-effort deletes the stored files.
router.delete(
  "/assignments/:assignmentId",
  requireAuth,
  async (req, res): Promise<void> => {
    const assignmentId = Number(req.params.assignmentId);
    if (!Number.isInteger(assignmentId)) {
      res.status(400).json({ error: "Invalid assignment id" });
      return;
    }

    const [existing] = await db
      .select()
      .from(assignmentsTable)
      .where(eq(assignmentsTable.id, assignmentId));
    if (!existing) {
      res.status(404).json({ error: "Assignment not found" });
      return;
    }

    const course = await getCourse(existing.courseId);
    if (!course || !isCourseTeacher(course, req.localUser!)) {
      res
        .status(403)
        .json({ error: "Only the course teacher can delete assignments" });
      return;
    }

    // Collect submissions (for child cleanup) and every object path to remove.
    const subs = await db
      .select()
      .from(submissionsTable)
      .where(eq(submissionsTable.assignmentId, assignmentId));
    const subIds = subs.map((s) => s.id);
    const objectPaths = [
      ...(existing.attachments ?? []).map((a) => a.path),
      ...subs.flatMap((s) => (s.files ?? []).map((f) => f.path)),
      ...subs.map((s) => s.videoPath),
      ...subs.map((s) => s.audioPath),
    ].filter((p): p is string => !!p);

    await db.transaction(async (tx) => {
      if (subIds.length) {
        await tx
          .delete(submissionMemberGradesTable)
          .where(inArray(submissionMemberGradesTable.submissionId, subIds));
        await tx
          .delete(submissionRubricScoresTable)
          .where(inArray(submissionRubricScoresTable.submissionId, subIds));
      }
      await tx
        .delete(submissionSimilaritiesTable)
        .where(eq(submissionSimilaritiesTable.assignmentId, assignmentId));
      await tx
        .delete(submissionsTable)
        .where(eq(submissionsTable.assignmentId, assignmentId));
      await tx
        .delete(groupTasksTable)
        .where(eq(groupTasksTable.assignmentId, assignmentId));
      await tx
        .delete(assignmentGroupsTable)
        .where(eq(assignmentGroupsTable.assignmentId, assignmentId));
      await tx
        .delete(assignmentTargetsTable)
        .where(eq(assignmentTargetsTable.assignmentId, assignmentId));
      await tx
        .delete(assignmentRubricsTable)
        .where(eq(assignmentRubricsTable.assignmentId, assignmentId));
      await tx
        .delete(gradeItemCategoriesTable)
        .where(
          and(
            eq(gradeItemCategoriesTable.courseId, existing.courseId),
            eq(gradeItemCategoriesTable.itemType, "assignment"),
            eq(gradeItemCategoriesTable.itemId, assignmentId),
          ),
        );
      await tx
        .delete(assignmentsTable)
        .where(eq(assignmentsTable.id, assignmentId));
    });

    // Best-effort: remove the now-orphaned uploaded files. Never fail the
    // delete over storage (may be unconfigured or already gone).
    const storage = new ObjectStorageService();
    for (const p of objectPaths) {
      try {
        await storage.getObjectEntityFile(p).delete({ ignoreNotFound: true });
      } catch {
        /* ignore */
      }
    }

    void logActivity({
      user: req.localUser!,
      action: "assignment.deleted",
      message: `${req.localUser!.email} deleted assignment "${existing.title}" and ${subIds.length} submission(s)`,
      metadata: {
        assignmentId,
        courseId: existing.courseId,
        deletedSubmissions: subIds.length,
      },
    });

    res.json({ ok: true, deletedSubmissions: subIds.length });
  },
);

export default router;
