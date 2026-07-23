import { NextResponse, type NextRequest } from "next/server";
import { consumeMagicToken, upsertUserByEmail, createSession } from "@/lib/data";
import { SESSION_COOKIE, sessionCookieOptions } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token");
  const nextParam = req.nextUrl.searchParams.get("next");
  const next = nextParam && nextParam.startsWith("/") ? nextParam : "/dashboard";
  const origin = req.nextUrl.origin;

  if (!token) {
    return NextResponse.redirect(`${origin}/login?error=invalid`);
  }

  const email = await consumeMagicToken(token);
  if (!email) {
    return NextResponse.redirect(`${origin}/login?error=expired`);
  }

  const user = await upsertUserByEmail(email);
  const session = await createSession(user.id);

  const res = NextResponse.redirect(`${origin}${next}`);
  res.cookies.set(SESSION_COOKIE, session, sessionCookieOptions);
  return res;
}
