import { Router, type IRouter, type Request, type Response } from "express";
import { z } from "zod";
import { randomUUID } from "crypto";
import { desc, eq } from "drizzle-orm";
import { db, appInvitesTable, usersTable, cohortsTable, type User } from "@workspace/db";
import { requireAuth, requireAdmin } from "../middlewares/auth";
import { logActivity } from "../lib/activityLog";
import { sendInviteEmail } from "../lib/email";

const router: IRouter = Router();

function inviteUrl(token: string): string {
  const base = (process.env.APP_BASE_URL || "").replace(/\/$/, "");
  return `${base}/sign-up?invite=${token}`;
}

const roleSchema = z.enum(["student", "teacher"]).default("student");
const cohortIdsSchema = z.array(z.number().int().positive()).optional().default([]);

async function upsertInvite(
  admin: User,
  opts: { email: string; name: string | null; role: "student" | "teacher"; cohortIds: number[] },
): Promise<{ invite: typeof appInvitesTable.$inferSelect; status: "created" | "updated" }> {
  const [existing] = await db
    .select()
    .from(appInvitesTable)
    .where(eq(appInvitesTable.email, opts.email));
  if (existing) {
    const [invite] = await db
      .update(appInvitesTable)
      .set({
        name: opts.name ?? existing.name,
        role: opts.role,
        // Selecting cohorts sets them; selecting none keeps the prior set.
        cohortIds: opts.cohortIds.length ? opts.cohortIds : existing.cohortIds,
      })
      .where(eq(appInvitesTable.id, existing.id))
      .returning();
    return { invite, status: "updated" };
  }
  const [invite] = await db
    .insert(appInvitesTable)
    .values({
      email: opts.email,
      name: opts.name,
      role: opts.role,
      cohortIds: opts.cohortIds,
      token: randomUUID(),
      invitedBy: admin.id,
      invitedByEmail: admin.email,
    })
    .returning();
  return { invite, status: "created" };
}

// GET /admin/cohorts — cohorts to assign invitees to, labeled by owning teacher
router.get(
  "/admin/cohorts",
  requireAuth,
  requireAdmin,
  async (_req: Request, res: Response) => {
    const rows = await db
      .select({
        id: cohortsTable.id,
        name: cohortsTable.name,
        teacherName: usersTable.name,
      })
      .from(cohortsTable)
      .leftJoin(usersTable, eq(usersTable.id, cohortsTable.teacherId))
      .orderBy(cohortsTable.name);
    res.json(rows);
  },
);

// GET /admin/invites — allow-list (cohortIds resolved to names client-side)
router.get(
  "/admin/invites",
  requireAuth,
  requireAdmin,
  async (_req: Request, res: Response) => {
    const rows = await db
      .select()
      .from(appInvitesTable)
      .orderBy(desc(appInvitesTable.createdAt));
    res.json(rows.map((r) => ({ ...r, inviteUrl: inviteUrl(r.token) })));
  },
);

// POST /admin/invites — add one user (email + role + optional cohorts)
const createSchema = z.object({
  email: z.string().trim().email(),
  name: z.string().trim().max(120).optional().nullable(),
  role: roleSchema,
  cohortIds: cohortIdsSchema,
});

router.post(
  "/admin/invites",
  requireAuth,
  requireAdmin,
  async (req: Request, res: Response) => {
    const parsed = createSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }
    const admin = req.localUser!;
    const email = parsed.data.email.toLowerCase();
    const [alreadyUser] = await db
      .select({ id: usersTable.id })
      .from(usersTable)
      .where(eq(usersTable.email, email));

    const { invite } = await upsertInvite(admin, {
      email,
      name: parsed.data.name?.trim() || null,
      role: parsed.data.role,
      cohortIds: parsed.data.cohortIds,
    });

    void logActivity({
      user: admin,
      action: "invite.created",
      message: `Invited ${email} as ${parsed.data.role}`,
      metadata: { email, role: parsed.data.role, cohorts: parsed.data.cohortIds.length },
    });
    void sendInviteEmail({
      email,
      name: invite.name,
      inviterName: admin.name,
      role: parsed.data.role,
      inviteUrl: inviteUrl(invite.token),
    });

    res.status(201).json({
      invite: { ...invite, inviteUrl: inviteUrl(invite.token) },
      alreadyRegistered: !!alreadyUser,
    });
  },
);

// POST /admin/invites/bulk — invite many at once (paste a list of emails)
const bulkSchema = z.object({
  emails: z.union([z.string(), z.array(z.string())]),
  role: roleSchema,
  cohortIds: cohortIdsSchema,
});

router.post(
  "/admin/invites/bulk",
  requireAuth,
  requireAdmin,
  async (req: Request, res: Response) => {
    const parsed = bulkSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }
    const admin = req.localUser!;
    const raw = Array.isArray(parsed.data.emails)
      ? parsed.data.emails.join("\n")
      : parsed.data.emails;
    const tokens = raw
      .split(/[\s,;]+/)
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean);

    const seen = new Set<string>();
    const valid: string[] = [];
    const invalid: string[] = [];
    for (const t of tokens) {
      if (seen.has(t)) continue;
      seen.add(t);
      if (/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(t)) valid.push(t);
      else invalid.push(t);
    }
    if (valid.length === 0) {
      res.status(400).json({ error: "No valid email addresses found", invalid });
      return;
    }

    let created = 0;
    let updated = 0;
    for (const email of valid) {
      const { status, invite } = await upsertInvite(admin, {
        email,
        name: null,
        role: parsed.data.role,
        cohortIds: parsed.data.cohortIds,
      });
      if (status === "created") created += 1;
      else updated += 1;
      void sendInviteEmail({
        email,
        name: null,
        inviterName: admin.name,
        role: parsed.data.role,
        inviteUrl: inviteUrl(invite.token),
      });
    }

    void logActivity({
      user: admin,
      action: "invite.bulk",
      message: `Bulk-invited ${valid.length} as ${parsed.data.role}`,
      metadata: { count: valid.length, invalid: invalid.length, cohorts: parsed.data.cohortIds.length },
    });

    res.status(201).json({ created, updated, invalid });
  },
);

// POST /admin/invites/:id/resend
router.post(
  "/admin/invites/:id/resend",
  requireAuth,
  requireAdmin,
  async (req: Request, res: Response) => {
    const id = Number(req.params.id);
    const [invite] = await db
      .select()
      .from(appInvitesTable)
      .where(eq(appInvitesTable.id, id));
    if (!invite) {
      res.status(404).json({ error: "Invite not found" });
      return;
    }
    void sendInviteEmail({
      email: invite.email,
      name: invite.name,
      inviterName: req.localUser!.name,
      role: invite.role === "teacher" ? "teacher" : "student",
      inviteUrl: inviteUrl(invite.token),
    });
    res.json({ ok: true, inviteUrl: inviteUrl(invite.token) });
  },
);

// DELETE /admin/invites/:id — revoke
router.delete(
  "/admin/invites/:id",
  requireAuth,
  requireAdmin,
  async (req: Request, res: Response) => {
    const id = Number(req.params.id);
    await db.delete(appInvitesTable).where(eq(appInvitesTable.id, id));
    res.json({ ok: true });
  },
);

export default router;
