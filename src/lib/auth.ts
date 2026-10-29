import { createHmac, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { isValidEmail } from "./validation";

export { SESSION_COOKIE } from "./cookie-name";
const SESSION_DAYS = 7;

export function getAuthSecret(): string {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error("AUTH_SECRET is not set");
  return secret;
}

function buf(hex: string): Buffer {
  return Buffer.from(hex, "hex");
}

function safeEqualHex(aHex: string, bHex: string): boolean {
  try {
    const a = buf(aHex);
    const b = buf(bHex);
    return a.length === b.length && timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

/** scrypt hash, format: scrypt:<saltHex>:<hashHex>. Salt is random per password. */
export function hashPassword(password: string): string {
  const salt = randomBytes(16);
  const hash = scryptSync(password, salt, 64, { N: 16384, p: 1, r: 8 });
  return `scrypt:${salt.toString("hex")}:${hash.toString("hex")}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const parts = stored.split(":");
  if (parts.length !== 3 || parts[0] !== "scrypt") return false;
  try {
    const hash = scryptSync(password, buf(parts[1]), 64, { N: 16384, p: 1, r: 8 });
    return safeEqualHex(hash.toString("hex"), parts[2]);
  } catch {
    return false;
  }
}

export function hashToken(token: string): string {
  return createHmac("sha256", getAuthSecret()).update(token).digest("hex");
}

/** Random session token (never stored in plaintext; only its hash is stored). */
export function newSessionToken(): string {
  return randomBytes(32).toString("hex");
}

/**
 * Cookie value: base64url("<sessionId>.<token>").<hmac>
 * The HMAC is over the payload, keyed by AUTH_SECRET, so a tampered
 * cookie fails verification before the database is consulted.
 */
export function signSessionCookie(sessionId: string, token: string, secret = getAuthSecret()): string {
  const payload = Buffer.from(`${sessionId}.${token}`, "utf8").toString("base64url");
  const sig = createHmac("sha256", secret).update(payload).digest("hex");
  return `${payload}.${sig}`;
}

export function verifySessionCookie(
  value: string | undefined | null,
  secret = getAuthSecret(),
): { sessionId: string; token: string } | null {
  if (!value) return null;
  const dot = value.lastIndexOf(".");
  if (dot <= 0) return null;
  const payload = value.slice(0, dot);
  const sig = value.slice(dot + 1);
  const expected = createHmac("sha256", secret).update(payload).digest("hex");
  if (!safeEqualHex(sig, expected)) return null;
  try {
    const decoded = Buffer.from(payload, "base64url").toString("utf8");
    const sep = decoded.indexOf(".");
    if (sep <= 0) return null;
    const sessionId = decoded.slice(0, sep);
    const token = decoded.slice(sep + 1);
    if (!sessionId || !token) return null;
    return { sessionId, token };
  } catch {
    return null;
  }
}

export function sessionExpiry(from = new Date()): Date {
  return new Date(from.getTime() + SESSION_DAYS * 24 * 60 * 60 * 1000);
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function validateCredentials(input: { email: string; password: string }): Record<string, string> {
  const errors: Record<string, string> = {};
  if (!isValidEmail(input.email)) errors.email = "Enter a valid email address.";
  if (input.password.length < 8) errors.password = "Password must be at least 8 characters.";
  return errors;
}
