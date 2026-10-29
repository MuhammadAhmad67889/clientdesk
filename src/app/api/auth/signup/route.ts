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
  const existing = await db.user.findUnique({ where: { email: normalized } });
  if (existing) {
    return NextResponse.json(
      { errors: { email: "Could not create an account with that email." } },
      { status: 400 },
    );
  }
  let userId: string | null = null;
  try {
    const user = await db.user.create({
      data: { email: normalized, passwordHash: hashPassword(password) },
    });
    userId = user.id;
    await seedDemoForUser(user.id, db);
    const { cookieValue } = await createSession(user.id, db);
    const res = NextResponse.json({ email: user.email, ok: true }, { status: 201 });
    setSessionCookie(res, cookieValue);
    return res;
  } catch (err) {
    // If seeding or the session failed after the user was created, remove
    // the user again (its clients/invoices cascade) so a retry can succeed
    // instead of hitting "email already taken" for an account that never
    // got set up.
    if (userId) {
      await db.user.delete({ where: { id: userId } }).catch(() => undefined);
    }
    if ((err as { code?: string })?.code === "P2002") {
      return NextResponse.json(
        { errors: { email: "Could not create an account with that email." } },
        { status: 400 },
      );
    }
    return NextResponse.json({ errors: { form: "Something went wrong. Try again." } }, { status: 500 });
  }
}
