import { NextRequest, NextResponse } from "next/server";
import { getPrisma } from "../../../../lib/prisma";
import { normalizeEmail, validateCredentials, verifyPassword } from "../../../../lib/auth";
import { createSession, setSessionCookie } from "../../../../lib/session-cookie";

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => null)) as { email?: unknown; password?: unknown } | null;
  const email = typeof body?.email === "string" ? body.email : "";
  const password = typeof body?.password === "string" ? body.password : "";
  const errors = validateCredentials({ email, password });
  if (Object.keys(errors).length > 0) {
    return NextResponse.json({ errors }, { status: 400 });
  }
  const db = getPrisma();
  const user = await db.user.findUnique({ where: { email: normalizeEmail(email) } });
  if (!user || !verifyPassword(password, user.passwordHash)) {
    return NextResponse.json({ errors: { form: "Invalid email or password." } }, { status: 401 });
  }
  const { cookieValue } = await createSession(user.id, db);
  const res = NextResponse.json({ email: user.email, ok: true });
  setSessionCookie(res, cookieValue);
  return res;
}
