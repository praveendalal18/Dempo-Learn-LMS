import { NextResponse, type NextRequest } from "next/server";
import { createMagicToken } from "@/lib/data";
import { sendMagicLink } from "@/lib/email";

export async function POST(req: NextRequest) {
  let email: string | undefined;
  let next = "/dashboard";
  try {
    const body = await req.json();
    email = body.email;
    if (typeof body.next === "string" && body.next.startsWith("/")) next = body.next;
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return NextResponse.json({ error: "Enter a valid email" }, { status: 400 });
  }

  const token = await createMagicToken(email);
  const origin = req.nextUrl.origin;
  const url = `${origin}/api/auth/verify?token=${token}&next=${encodeURIComponent(next)}`;
  await sendMagicLink(email, url);

  // Never reveal whether the address exists.
  return NextResponse.json({ ok: true });
}
