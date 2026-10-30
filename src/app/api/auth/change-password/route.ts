import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getPrisma } from "../../../../lib/prisma";
import {
  hashPassword,
  SESSION_COOKIE,
  verifyPassword,
  verifySessionCookie,
} from "../../../../lib/auth";
import { getSessionUser } from "../../../../lib/data";
import { validatePasswordChange } from "../../../../lib/validation";

export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ errors: { form: "You are not logged in." } }, { status: 401 });

  const body = (await req.json().catch(() => null)) as {
    confirmPassword?: unknown;
    currentPassword?: unknown;
    newPassword?: unknown;
  } | null;
  const input = {
    confirmPassword: typeof body?.confirmPassword === "string" ? body.confirmPassword : "",
    currentPassword: typeof body?.currentPassword === "string" ? body.currentPassword : "",
    newPassword: typeof body?.newPassword === "string" ? body.newPassword : "",
  };
  const errors = validatePasswordChange(input);
  if (Object.keys(errors).length > 0) {
    return NextResponse.json({ errors }, { status: 400 });
  }

  const db = getPrisma();
  const account = await db.user.findUnique({ where: { id: user.id } });
  if (!account || !verifyPassword(input.currentPassword, account.passwordHash)) {
    return NextResponse.json({ errors: { currentPassword: "Current password is incorrect." } }, { status: 401 });
  }
  await db.user.update({
    data: { passwordHash: hashPassword(input.newPassword) },
    where: { id: user.id },
  });
  // Sign out everywhere else, but keep this session working.
  const cookieValue = (await cookies()).get(SESSION_COOKIE)?.value;
  const current = verifySessionCookie(cookieValue);
  await db.session.deleteMany({
    where: current ? { userId: user.id, id: { not: current.sessionId } } : { userId: user.id },
  });
  return NextResponse.json({ ok: true });
}
