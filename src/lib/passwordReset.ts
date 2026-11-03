import { createHash, randomBytes } from "crypto";

/** Password reset tokens: the raw token goes to the user by email,
 * only its hash is stored, it lasts one hour, and it is single-use.
 * Nothing here touches the database — the routes do that. */
export const RESET_TOKEN_TTL_MS = 60 * 60 * 1000;

export function hashResetToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function buildResetToken(now = Date.now()): {
  expiresAt: Date;
  token: string;
  tokenHash: string;
} {
  const token = randomBytes(32).toString("hex");
  return {
    expiresAt: new Date(now + RESET_TOKEN_TTL_MS),
    token,
    tokenHash: hashResetToken(token),
  };
}

/** A stored token is usable only while unused and unexpired. */
export function isResetTokenUsable(
  record: { expiresAt: Date; usedAt: Date | null },
  now = Date.now(),
): boolean {
  return record.usedAt === null && record.expiresAt.getTime() > now;
}
