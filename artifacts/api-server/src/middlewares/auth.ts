import { type Request, type Response, type NextFunction } from "express";
import { getAuth, clerkClient } from "@clerk/express";
import { eq } from "drizzle-orm";
import { db, usersTable, teacherInvitesTable, appInvitesTable, cohortMembersTable, type User } from "@workspace/db";
import { logActivity } from "../lib/activityLog";

// Emails that are automatically provisioned as teacher + admin. Configured via
// the ADMIN_EMAILS env var (comma-separated). Empty by default — no hardcoded
// admin backdoor in the source.
const ADMIN_EMAILS = new Set(
  (process.env.ADMIN_EMAILS || "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean),
);

function isAdminEmail(email: string | null | undefined): boolean {
  return !!email && ADMIN_EMAILS.has(email.trim().toLowerCase());
}

// Extend Express Request with our resolved local user.
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      userId?: string;
      localUser?: User;
    }
  }
}

/**
 * Deletes a pending teacher invite matching the email (case-insensitive) and
 * returns whether one existed.
 */
async function consumeTeacherInvite(
  email: string | null | undefined,
): Promise<boolean> {
  const normalized = (email ?? "").trim().toLowerCase();
  if (!normalized) return false;
  const deleted = await db
    .delete(teacherInvitesTable)
    .where(eq(teacherInvitesTable.email, normalized))
    .returning();
  return deleted.length > 0;
}

/**
 * Requires a valid Clerk session and JIT-provisions a local user row keyed by
 * the Clerk user id. Attaches req.userId and req.localUser.
 */
export async function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const auth = getAuth(req);
  const userId = auth?.userId;
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  let [user] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.id, userId));

  if (!user) {
    // Fetch profile details from Clerk to seed the local row.
    let email = "";
    let name: string | null = null;
    let avatarUrl: string | null = null;
    try {
      const clerkUser = await clerkClient.users.getUser(userId);
      email =
        clerkUser.primaryEmailAddress?.emailAddress ??
        clerkUser.emailAddresses[0]?.emailAddress ??
        "";
      const fullName = [clerkUser.firstName, clerkUser.lastName]
        .filter(Boolean)
        .join(" ")
        .trim();
      name = fullName || clerkUser.username || null;
      avatarUrl = clerkUser.imageUrl ?? null;
    } catch (err) {
      req.log.warn({ err }, "Failed to fetch Clerk user for provisioning");
    }

    const normalizedEmail = email.trim().toLowerCase();
    const admin = isAdminEmail(email);
    let role = "unassigned";
    let acceptedInviteRole: string | null = null;
    let legacyTeacher = false;
    let inviteCohortIds: number[] = [];

    if (admin) {
      role = "teacher";
    } else {
      // Access is invite-only: require a matching entry on the allow-list.
      const [invite] = normalizedEmail
        ? await db
            .select()
            .from(appInvitesTable)
            .where(eq(appInvitesTable.email, normalizedEmail))
        : [];
      if (invite) {
        role = invite.role === "teacher" ? "teacher" : "student";
        acceptedInviteRole = role;
        inviteCohortIds = invite.cohortIds ?? [];
      } else if (await consumeTeacherInvite(email)) {
        role = "teacher";
        legacyTeacher = true;
      } else {
        // Not on the allow-list — deny access without provisioning a user.
        res.status(403).json({ error: "not_invited" });
        return;
      }
    }

    [user] = await db
      .insert(usersTable)
      .values({
        id: userId,
        email,
        name,
        avatarUrl,
        role,
        isAdmin: admin,
      })
      .onConflictDoNothing()
      .returning();

    if (!user) {
      [user] = await db
        .select()
        .from(usersTable)
        .where(eq(usersTable.id, userId));
    } else {
      if (acceptedInviteRole && normalizedEmail) {
        void db
          .update(appInvitesTable)
          .set({ acceptedAt: new Date() })
          .where(eq(appInvitesTable.email, normalizedEmail));
      }
      for (const cid of inviteCohortIds) {
        void db
          .insert(cohortMembersTable)
          .values({ cohortId: cid, studentId: user.id })
          .onConflictDoNothing();
      }
      void logActivity({
        user,
        action:
          acceptedInviteRole || legacyTeacher
            ? "invite.redeemed"
            : "auth.provisioned",
        message: admin
          ? `New user provisioned as teacher + admin: ${email}`
          : acceptedInviteRole
            ? `Invited ${acceptedInviteRole} joined: ${email}`
            : legacyTeacher
              ? `Invited teacher joined: ${email}`
              : `New user provisioned: ${email || userId}`,
        metadata: { role: user.role, isAdmin: user.isAdmin },
      });
    }
  } else if (user.role === "unassigned" && !isAdminEmail(user.email)) {
    // A user who signed in before picking a role: honor a pending teacher
    // invite created for their email.
    if (await consumeTeacherInvite(user.email)) {
      const [upgraded] = await db
        .update(usersTable)
        .set({ role: "teacher" })
        .where(eq(usersTable.id, userId))
        .returning();
      if (upgraded) {
        user = upgraded;
        void logActivity({
          user,
          action: "teacher.invite_redeemed",
          message: `Pending teacher invite applied to ${user.email}`,
          metadata: { role: user.role },
        });
      }
    }
  } else if (isAdminEmail(user.email) && (!user.isAdmin || user.role === "unassigned")) {
    // Upgrade an existing designated-admin account that predates the flag.
    const [upgraded] = await db
      .update(usersTable)
      .set({
        isAdmin: true,
        role: user.role === "unassigned" ? "teacher" : user.role,
      })
      .where(eq(usersTable.id, userId))
      .returning();
    if (upgraded) {
      user = upgraded;
      void logActivity({
        user,
        action: "user.admin_granted",
        message: `Admin privileges granted to ${user.email}`,
        metadata: { role: user.role },
      });
    }
  }

  req.userId = userId;
  req.localUser = user;
  next();
}

/**
 * Requires the authenticated local user to be an admin. Must run after
 * requireAuth.
 */
export function requireAdmin(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  if (!req.localUser?.isAdmin) {
    res.status(403).json({ error: "Admin access required" });
    return;
  }
  next();
}
