import { NextRequest, NextResponse } from "next/server";
import { getPrisma } from "../../../../lib/prisma";
import { hashPassword, normalizeEmail, validateCredentials } from "../../../../lib/auth";
import { seedDemoForUser } from "../../../../lib/data";
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
  const normalized = normalizeEmail(email);
  try {
    const user = await db.user.create({
      data: { email: normalized, passwordHash: hashPassword(password) },
    });
    await seedDemoForUser(user.id, db);
    const { cookieValue } = await createSession(user.id, db);
    const res = NextResponse.json({ email: user.email, ok: true }, { status: 201 });
    setSessionCookie(res, cookieValue);
    return res;
  } catch {
    // Generic error for duplicate email: do not confirm whether an
    // address is already registered beyond what signup itself reveals.
    return NextResponse.json(
      { errors: { email: "Could not create an account with that email." } },
      { status: 400 },
    );
  }
}
