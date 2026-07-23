import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getSessionUser, type AppUser } from "./data";

export const SESSION_COOKIE = "aip_session";

export const sessionCookieOptions = {
  httpOnly: true,
  sameSite: "lax" as const,
  path: "/",
  secure: process.env.NODE_ENV === "production",
  maxAge: 30 * 24 * 60 * 60,
};

/** Current logged-in user, or null. Reads the httpOnly session cookie. */
export async function getCurrentUser(): Promise<AppUser | null> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  return getSessionUser(token);
}

/** Require a logged-in user; redirect to login (with return path) otherwise. */
export async function requireUser(loginNext = "/dashboard"): Promise<AppUser> {
  const user = await getCurrentUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(loginNext)}`);
  return user;
}

/** Require an admin; 404 for non-admins so admin routes stay unlisted. */
export async function requireAdmin(): Promise<AppUser> {
  const user = await getCurrentUser();
  if (!user) redirect(`/login?next=/admin`);
  if (!user.isAdmin) redirect("/dashboard");
  return user;
}
