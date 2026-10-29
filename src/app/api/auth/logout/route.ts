import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { SESSION_COOKIE, verifySessionCookie } from "../../../../lib/auth";
import { getPrisma } from "../../../../lib/prisma";
import { clearSessionCookie } from "../../../../lib/session-cookie";

export async function POST() {
  const db = getPrisma();
  const parsed = verifySessionCookie((await cookies()).get(SESSION_COOKIE)?.value);
  if (parsed) {
    await db.session.delete({ where: { id: parsed.sessionId } }).catch(() => undefined);
  }
  const res = NextResponse.json({ ok: true });
  clearSessionCookie(res);
  return res;
}
