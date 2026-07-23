import { NextResponse, type NextRequest } from "next/server";
import { cookies } from "next/headers";
import { deleteSession } from "@/lib/data";
import { SESSION_COOKIE } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const store = await cookies();
  await deleteSession(store.get(SESSION_COOKIE)?.value);
  const res = NextResponse.redirect(`${req.nextUrl.origin}/`, { status: 303 });
  res.cookies.delete(SESSION_COOKIE);
  return res;
}
