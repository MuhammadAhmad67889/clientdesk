import { NextRequest, NextResponse } from "next/server";
import { getPrisma } from "../../../../lib/prisma";
import { hashPassword } from "../../../../lib/auth";
import { hashResetToken, isResetTokenUsable } from "../../../../lib/passwordReset";
import { clientIp, isRateLimited } from "../../../../lib/rateLimit";

export async function POST(req: NextRequest) {
  if (isRateLimited(`reset:${clientIp(req)}`, 10, 60_000)) {
    return NextResponse.json(
      { errors: { form: "Too many attempts. Try again in a minute." } },
      { status: 429 },
    );
  }
  const body = (await req.json().catch(() => null)) as { password?: unknown; token?: unknown } | null;
  const token = typeof body?.token === "string" ? body.token : "";
  const password = typeof body?.password === "string" ? body.password : "";
  if (password.length < 8) {
    return NextResponse.json(
      { errors: { form: "Password must be at least 8 characters." } },
      { status: 400 },
    );
  }
  const db = getPrisma();
  const record = await db.passwordResetToken.findUnique({ where: { tokenHash: hashResetToken(token) } });
  if (!record || !isResetTokenUsable(record)) {
    return NextResponse.json(
      { errors: { form: "This reset link is invalid or expired." } },
      { status: 400 },
    );
  }
  // Change the password and burn the token in one transaction, so a
  // link can never be used twice even if two requests race.
  await db.$transaction([
    db.user.update({ data: { passwordHash: hashPassword(password) }, where: { id: record.userId } }),
    db.passwordResetToken.update({ data: { usedAt: new Date() }, where: { id: record.id } }),
  ]);
  return NextResponse.json({ ok: true });
}
