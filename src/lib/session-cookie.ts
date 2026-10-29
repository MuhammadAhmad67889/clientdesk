import type { PrismaClient } from "@prisma/client";
import { NextResponse } from "next/server";
import {
  hashToken,
  newSessionToken,
  SESSION_COOKIE,
  sessionExpiry,
  signSessionCookie,
} from "./auth";
import { getPrisma } from "./prisma";

export async function createSession(
  userId: string,
  db: PrismaClient = getPrisma(),
): Promise<{ cookieValue: string; sessionId: string }> {
  const token = newSessionToken();
  const session = await db.session.create({
    data: { expiresAt: sessionExpiry(), tokenHash: hashToken(token), userId },
  });
  return { cookieValue: signSessionCookie(session.id, token), sessionId: session.id };
}

export function setSessionCookie(res: NextResponse, cookieValue: string): void {
  res.cookies.set(SESSION_COOKIE, cookieValue, {
    httpOnly: true,
    maxAge: 7 * 24 * 60 * 60,
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });
}

export function clearSessionCookie(res: NextResponse): void {
  res.cookies.set(SESSION_COOKIE, "", {
    httpOnly: true,
    maxAge: 0,
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });
}
