import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from "vitest";
import express, { type Express } from "express";
import request from "supertest";
import { eq, inArray, like } from "drizzle-orm";
import {
  db,
  usersTable,
  coursesTable,
  teacherInvitesTable,
  activityLogsTable,
  assignmentsTable,
  enrollmentsTable,
  submissionsTable,
} from "@workspace/db";

const mockGetAuth = vi.fn();
const mockGetUser = vi.fn();

vi.mock("@clerk/express", () => ({
  getAuth: (...args: unknown[]) => mockGetAuth(...args),
  clerkClient: {
    users: {
      getUser: (...args: unknown[]) => mockGetUser(...args),
    },
  },
}));

const { default: adminRouter } = await import("./admin");
const { default: meRouter } = await import("./me");
const { default: submissionsRouter } = await import("./submissions");
const { default: coursesRouter } = await import("./courses");
const { default: materialsRouter } = await import("./materials");

const TEST_PREFIX = "task46test";
const ADMIN_ID = `${TEST_PREFIX}_admin`;
const TEACHER_ID = `${TEST_PREFIX}_teacher`;
const NEWBIE_ID = `${TEST_PREFIX}_newbie`;
const UNASSIGNED_ID = `${TEST_PREFIX}_unassigned`;
const TEST_IDS = [ADMIN_ID, TEACHER_ID, NEWBIE_ID, UNASSIGNED_ID];
const INVITE_EMAILS = [
  `${TEST_PREFIX}_invited@example.com`,
  `${TEST_PREFIX}_revoked@example.com`,
  `${TEST_PREFIX}_pending@example.com`,
  `${TEST_PREFIX}_unassigned@example.com`,
];

function buildApp(): Express {
  const app = express();
  app.use((req, _res, next) => {
    // @ts-expect-error minimal logger stub for tests
    req.log = { warn: () => {}, info: () => {}, error: () => {} };
    next();
  });
  app.use(express.json());
  app.use("/api", adminRouter);
  app.use("/api", meRouter);
  app.use("/api", submissionsRouter);
  app.use("/api", coursesRouter);
  app.use("/api", materialsRouter);
  return app;
}

const app = buildApp();

function actAs(userId: string | null): void {
  mockGetAuth.mockReturnValue({ userId });
}

async function cleanup(): Promise<void> {
  await db.delete(usersTable).where(inArray(usersTable.id, TEST_IDS));
  await db
    .delete(teacherInvitesTable)
    .where(inArray(teacherInvitesTable.email, INVITE_EMAILS));
  await db
    .delete(coursesTable)
    .where(like(coursesTable.title, `${TEST_PREFIX}%`));
  await db
    .delete(activityLogsTable)
    .where(inArray(activityLogsTable.userId, TEST_IDS));
}

beforeAll(async () => {
  await cleanup();
  await db.insert(usersTable).values([
    { id: ADMIN_ID, email: `${TEST_PREFIX}_admin@example.com`, role: "teacher", isAdmin: true },
    { id: TEACHER_ID, email: `${TEST_PREFIX}_teacher@example.com`, role: "teacher", isAdmin: false },
    { id: UNASSIGNED_ID, email: `${TEST_PREFIX}_unassigned@example.com`, role: "unassigned", isAdmin: false },
  ]);
});
afterAll(cleanup);

beforeEach(() => {
  mockGetAuth.mockReset();
  mockGetUser.mockReset();
});

describe("teacher invites CRUD", () => {
  it("rejects non-admin invite creation", async () => {
    actAs(TEACHER_ID);
    const res = await request(app)
      .post("/api/admin/teacher-invites")
      .send({ email: INVITE_EMAILS[0] });
    expect(res.status).toBe(403);
  });

  it("creates, lists, and revokes invites; validates input", async () => {
    actAs(ADMIN_ID);
    const bad = await request(app)
      .post("/api/admin/teacher-invites")
      .send({ email: "not-an-email" });
    expect(bad.status).toBe(400);

    const created = await request(app)
      .post("/api/admin/teacher-invites")
      .send({ email: INVITE_EMAILS[2].toUpperCase() });
    expect(created.status).toBe(201);
    expect(created.body.email).toBe(INVITE_EMAILS[2]);

    const dup = await request(app)
      .post("/api/admin/teacher-invites")
      .send({ email: INVITE_EMAILS[2] });
    expect(dup.status).toBe(409);

    const existing = await request(app)
      .post("/api/admin/teacher-invites")
      .send({ email: `${TEST_PREFIX}_teacher@example.com` });
    expect(existing.status).toBe(409);

    const list = await request(app).get("/api/admin/teacher-invites");
    expect(list.status).toBe(200);
    expect(list.body.some((i: { email: string }) => i.email === INVITE_EMAILS[2])).toBe(true);

    const revoked = await request(app).delete(
      `/api/admin/teacher-invites/${created.body.id}`,
    );
    expect(revoked.status).toBe(204);
    const gone = await request(app).delete(
      `/api/admin/teacher-invites/${created.body.id}`,
    );
    expect(gone.status).toBe(404);
  });
});

describe("invite provisioning on first sign-in", () => {
  it("provisions a brand-new invited user as teacher and consumes the invite", async () => {
    actAs(ADMIN_ID);
    await request(app)
      .post("/api/admin/teacher-invites")
      .send({ email: INVITE_EMAILS[0] });

    actAs(NEWBIE_ID);
    mockGetUser.mockResolvedValue({
      primaryEmailAddress: { emailAddress: INVITE_EMAILS[0] },
      emailAddresses: [{ emailAddress: INVITE_EMAILS[0], verification: { status: "verified" } }],
      firstName: "New",
      lastName: "Teacher",
      imageUrl: null,
      username: null,
    });
    const me = await request(app).get("/api/me");
    expect(me.status).toBe(200);
    expect(me.body.role).toBe("teacher");

    const [invite] = await db
      .select()
      .from(teacherInvitesTable)
      .where(eq(teacherInvitesTable.email, INVITE_EMAILS[0]));
    expect(invite).toBeUndefined();
  });

  it("upgrades an existing unassigned user with a pending invite", async () => {
    // The API refuses to invite an email that already has an account, so this
    // covers the race where the invite predates provisioning: seed directly.
    await db.insert(teacherInvitesTable).values({
      email: `${TEST_PREFIX}_unassigned@example.com`,
      createdBy: ADMIN_ID,
    });

    actAs(UNASSIGNED_ID);
    const me = await request(app).get("/api/me");
    expect(me.status).toBe(200);
    expect(me.body.role).toBe("teacher");
  });
});

describe("remove teacher access", () => {
  it("blocks self-demotion, demotes teacher, deactivates courses", async () => {
    actAs(ADMIN_ID);
    const self = await request(app).post(
      `/api/admin/users/${ADMIN_ID}/remove-teacher`,
    );
    expect(self.status).toBe(400);

    await db.insert(coursesTable).values({
      title: `${TEST_PREFIX} course`,
      teacherId: TEACHER_ID,
      inviteCode: `T46${Math.random().toString(36).slice(2, 8).toUpperCase()}`,
    });

    const res = await request(app).post(
      `/api/admin/users/${TEACHER_ID}/remove-teacher`,
    );
    expect(res.status).toBe(200);
    expect(res.body.user.role).toBe("student");
    expect(res.body.deactivatedCourses).toBe(1);

    const [course] = await db
      .select()
      .from(coursesTable)
      .where(eq(coursesTable.teacherId, TEACHER_ID));
    expect(course.isActive).toBe(false);

    const again = await request(app).post(
      `/api/admin/users/${TEACHER_ID}/remove-teacher`,
    );
    expect(again.status).toBe(400);
  });

  it("blocks students from creating/viewing submissions in a deactivated course", async () => {
    // The teacher's course was deactivated in the previous test. Enroll a
    // student, create an assignment + submission, and verify access is gone.
    const [course] = await db
      .select()
      .from(coursesTable)
      .where(eq(coursesTable.teacherId, TEACHER_ID));
    expect(course.isActive).toBe(false);

    const [assignment] = await db
      .insert(assignmentsTable)
      .values({
        courseId: course.id,
        title: `${TEST_PREFIX} assignment`,
        allowedTypes: ["text"],
      })
      .returning();
    await db
      .insert(enrollmentsTable)
      .values({ courseId: course.id, studentId: UNASSIGNED_ID });
    const [submission] = await db
      .insert(submissionsTable)
      .values({
        assignmentId: assignment.id,
        studentId: UNASSIGNED_ID,
        textResponse: "hello",
      })
      .returning();

    actAs(UNASSIGNED_ID);
    const create = await request(app)
      .post(`/api/assignments/${assignment.id}/submissions`)
      .send({ textResponse: "sneaky", aiDeclaration: "none" });
    expect(create.status).toBe(404);

    const view = await request(app).get(`/api/submissions/${submission.id}`);
    expect(view.status).toBe(403);

    const mine = await request(app).get("/api/submissions/mine");
    expect(mine.status).toBe(200);
    expect(
      mine.body.some((s: { id: number }) => s.id === submission.id),
    ).toBe(false);

    // Cleanup rows created here.
    await db.delete(submissionsTable).where(eq(submissionsTable.id, submission.id));
    await db.delete(assignmentsTable).where(eq(assignmentsTable.id, assignment.id));
    await db
      .delete(enrollmentsTable)
      .where(eq(enrollmentsTable.courseId, course.id));
  });

  it("demoted teacher loses teacher-level access to their old courses", async () => {
    const [course] = await db
      .select()
      .from(coursesTable)
      .where(eq(coursesTable.teacherId, TEACHER_ID));

    actAs(TEACHER_ID); // now role=student after demotion
    const createCourse = await request(app)
      .post("/api/courses")
      .send({ title: `${TEST_PREFIX} nope` });
    expect(createCourse.status).toBe(403);

    const roster = await request(app).get(`/api/courses/${course.id}/students`);
    expect(roster.status).toBe(403);

    const view = await request(app).get(`/api/courses/${course.id}`);
    expect(view.status).toBe(403);

    const material = await request(app)
      .post(`/api/courses/${course.id}/materials`)
      .send({ title: "nope" });
    expect([403, 404]).toContain(material.status);
  });

  it("PATCH role cannot silently demote a teacher", async () => {
    await db
      .update(usersTable)
      .set({ role: "teacher" })
      .where(eq(usersTable.id, TEACHER_ID));
    actAs(ADMIN_ID);
    const res = await request(app)
      .patch(`/api/admin/users/${TEACHER_ID}`)
      .send({ role: "student" });
    expect(res.status).toBe(400);
  });
});
