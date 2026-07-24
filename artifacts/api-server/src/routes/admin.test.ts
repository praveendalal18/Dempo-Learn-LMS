import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from "vitest";
import express, { type Express } from "express";
import request from "supertest";
import { eq, like, inArray } from "drizzle-orm";
import { db, usersTable, activityLogsTable } from "@workspace/db";

// ---------------------------------------------------------------------------
// Mock Clerk: control the authenticated user id + the Clerk profile lookup.
// ---------------------------------------------------------------------------
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

// Imported after the mock so the middleware picks up the mocked module.
const { default: adminRouter } = await import("./admin");

const ADMIN_EMAIL = "pravendalal@gmail.com";
const TEST_PREFIX = "task13test";
const TEST_IDS = [
  `${TEST_PREFIX}_nonadmin`,
  `${TEST_PREFIX}_newadmin`,
  `${TEST_PREFIX}_upgrade`,
  `${TEST_PREFIX}_viewer`,
];

function buildApp(): Express {
  const app = express();
  // requireAuth uses req.log.warn in a catch path; pino-http isn't mounted here.
  app.use((req, _res, next) => {
    // @ts-expect-error minimal logger stub for tests
    req.log = { warn: () => {}, info: () => {}, error: () => {} };
    next();
  });
  app.use("/api", adminRouter);
  return app;
}

const app = buildApp();

async function cleanup(): Promise<void> {
  await db.delete(usersTable).where(inArray(usersTable.id, TEST_IDS));
  await db
    .delete(activityLogsTable)
    .where(like(activityLogsTable.action, `${TEST_PREFIX}.%`));
  // Logs written by provisioning/upgrade for our synthetic users.
  await db
    .delete(activityLogsTable)
    .where(inArray(activityLogsTable.userId, TEST_IDS));
}

beforeAll(cleanup);
afterAll(cleanup);

beforeEach(() => {
  mockGetAuth.mockReset();
  mockGetUser.mockReset();
});

describe("GET /api/admin/logs access control", () => {
  it("returns 401 when unauthenticated", async () => {
    mockGetAuth.mockReturnValue({ userId: null });
    const res = await request(app).get("/api/admin/logs");
    expect(res.status).toBe(401);
    expect(res.body).toEqual({ error: "Unauthorized" });
  });

  it("returns 403 for an authenticated non-admin user", async () => {
    const id = `${TEST_PREFIX}_nonadmin`;
    await db
      .insert(usersTable)
      .values({ id, email: `${id}@example.com`, role: "student", isAdmin: false })
      .onConflictDoNothing();
    mockGetAuth.mockReturnValue({ userId: id });

    const res = await request(app).get("/api/admin/logs");
    expect(res.status).toBe(403);
    expect(res.body).toEqual({ error: "Admin access required" });
  });

  it("auto-provisions the designated admin email as teacher + admin and allows access", async () => {
    const id = `${TEST_PREFIX}_newadmin`;
    mockGetAuth.mockReturnValue({ userId: id });
    mockGetUser.mockResolvedValue({
      primaryEmailAddress: { emailAddress: ADMIN_EMAIL },
      emailAddresses: [{ emailAddress: ADMIN_EMAIL, verification: { status: "verified" } }],
      firstName: "Praven",
      lastName: "Dalal",
      username: null,
      imageUrl: null,
    });

    const res = await request(app).get("/api/admin/logs");
    expect(res.status).toBe(200);

    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, id));
    expect(user).toBeDefined();
    expect(user!.isAdmin).toBe(true);
    expect(user!.role).toBe("teacher");
  });

  it("upgrades a pre-existing designated-admin account that lacks the flag", async () => {
    const id = `${TEST_PREFIX}_upgrade`;
    await db
      .insert(usersTable)
      .values({ id, email: ADMIN_EMAIL, role: "unassigned", isAdmin: false })
      .onConflictDoNothing();
    mockGetAuth.mockReturnValue({ userId: id });

    const res = await request(app).get("/api/admin/logs");
    expect(res.status).toBe(200);

    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, id));
    expect(user!.isAdmin).toBe(true);
    expect(user!.role).toBe("teacher");
  });

  it("does NOT auto-upgrade a non-designated email", async () => {
    const id = `${TEST_PREFIX}_nonadmin`;
    mockGetAuth.mockReturnValue({ userId: id });
    const res = await request(app).get("/api/admin/logs");
    expect(res.status).toBe(403);
    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, id));
    expect(user!.isAdmin).toBe(false);
  });
});

describe("GET /api/admin/logs filters & pagination", () => {
  const viewerId = `${TEST_PREFIX}_viewer`;

  beforeAll(async () => {
    await db
      .insert(usersTable)
      .values({
        id: viewerId,
        email: `${viewerId}@example.com`,
        role: "teacher",
        isAdmin: true,
      })
      .onConflictDoNothing();

    // Seed a predictable set of logs under a unique action prefix.
    const rows = [];
    for (let i = 0; i < 30; i++) {
      rows.push({
        userId: viewerId,
        userEmail: `${viewerId}@example.com`,
        level: i % 3 === 0 ? "error" : "info",
        action: i % 2 === 0 ? `${TEST_PREFIX}.even` : `${TEST_PREFIX}.odd`,
        message: `seed ${i}`,
        metadata: { i },
      });
    }
    await db.insert(activityLogsTable).values(rows);
  });

  beforeEach(() => {
    mockGetAuth.mockReturnValue({ userId: viewerId });
  });

  it("filters by action prefix and paginates", async () => {
    const res = await request(app)
      .get("/api/admin/logs")
      .query({ action: TEST_PREFIX, page: 1, pageSize: 10 });
    expect(res.status).toBe(200);
    expect(res.body.total).toBe(30);
    expect(res.body.items).toHaveLength(10);
    expect(res.body.page).toBe(1);
    expect(res.body.pageSize).toBe(10);

    const res2 = await request(app)
      .get("/api/admin/logs")
      .query({ action: TEST_PREFIX, page: 3, pageSize: 10 });
    expect(res2.status).toBe(200);
    expect(res2.body.items).toHaveLength(10);
    // Pages must not overlap.
    const ids1 = new Set(res.body.items.map((it: { id: number }) => it.id));
    for (const it of res2.body.items) expect(ids1.has(it.id)).toBe(false);

    const res3 = await request(app)
      .get("/api/admin/logs")
      .query({ action: TEST_PREFIX, page: 4, pageSize: 10 });
    expect(res3.body.items).toHaveLength(0);
  });

  it("filters by level", async () => {
    const res = await request(app)
      .get("/api/admin/logs")
      .query({ action: TEST_PREFIX, level: "error" });
    expect(res.status).toBe(200);
    expect(res.body.total).toBe(10); // i = 0,3,6,...,27
    for (const it of res.body.items) expect(it.level).toBe("error");
  });

  it("filters by exact action", async () => {
    const res = await request(app)
      .get("/api/admin/logs")
      .query({ action: `${TEST_PREFIX}.even`, pageSize: 50 });
    expect(res.status).toBe(200);
    expect(res.body.total).toBe(15);
    for (const it of res.body.items) expect(it.action).toBe(`${TEST_PREFIX}.even`);
  });

  it("filters by user email substring", async () => {
    const res = await request(app)
      .get("/api/admin/logs")
      .query({ user: viewerId, pageSize: 50 });
    expect(res.status).toBe(200);
    expect(res.body.total).toBeGreaterThanOrEqual(30);
    for (const it of res.body.items) {
      expect(
        it.userId === viewerId || (it.userEmail ?? "").includes(viewerId),
      ).toBe(true);
    }
  });

  it("filters by from/to date range", async () => {
    const res = await request(app)
      .get("/api/admin/logs")
      .query({
        action: TEST_PREFIX,
        from: new Date(Date.now() - 60_000).toISOString(),
        to: new Date(Date.now() + 60_000).toISOString(),
      });
    expect(res.status).toBe(200);
    expect(res.body.total).toBe(30);

    const resEmpty = await request(app)
      .get("/api/admin/logs")
      .query({
        action: TEST_PREFIX,
        to: new Date("2000-01-01").toISOString(),
      });
    expect(resEmpty.status).toBe(200);
    expect(resEmpty.body.total).toBe(0);
  });

  it("orders newest first", async () => {
    const res = await request(app)
      .get("/api/admin/logs")
      .query({ action: TEST_PREFIX, pageSize: 50 });
    const times = res.body.items.map((it: { createdAt: string; id: number }) =>
      new Date(it.createdAt).getTime(),
    );
    for (let i = 1; i < times.length; i++) {
      expect(times[i - 1]).toBeGreaterThanOrEqual(times[i]);
    }
  });

  it("rejects invalid query params with 400", async () => {
    const res = await request(app)
      .get("/api/admin/logs")
      .query({ page: "not-a-number" });
    expect(res.status).toBe(400);
  });
});
