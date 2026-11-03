import { NextRequest, NextResponse } from "next/server";
import { getPrisma } from "../../../../lib/prisma";
import { isEmailConfigured, sendPasswordResetEmail } from "../../../../lib/email";
import { buildResetToken } from "../../../../lib/passwordReset";
import { clientIp, isRateLimited } from "../../../../lib/rateLimit";
import { normalizeEmail } from "../../../../lib/auth";

export async function POST(req: NextRequest) {
  if (isRateLimited(`forgot:${clientIp(req)}`, 5, 60_000)) {
    return NextResponse.json(
      { errors: { form: "Too many attempts. Try again in a minute." } },
      { status: 429 },
    );
  }
  if (!isEmailConfigured()) {
    return NextResponse.json(
      { errors: { form: "Password reset by email is not set up yet." } },
      { status: 503 },
    );
  }
  const body = (await req.json().catch(() => null)) as { email?: unknown } | null;
  const email = typeof body?.email === "string" ? body.email : "";
  const db = getPrisma();
  const user = await db.user.findUnique({ where: { email: normalizeEmail(email) } });
  // The answer is always the same whether or not the account exists,
  // so the response cannot be used to test for accounts.
  if (user) {
    const built = buildResetToken();
    await db.passwordResetToken.create({
      data: { expiresAt: built.expiresAt, tokenHash: built.tokenHash, userId: user.id },
    });
    const resetUrl = `${new URL(req.url).origin}/reset-password?token=${built.token}`;
    await sendPasswordResetEmail(user.email, resetUrl).catch((err) => {
      console.error("Password reset email failed:", err);
    });
  }
  return NextResponse.json({ ok: true });
}
