/** In-memory rate limiting for the auth routes. One entry per key
 * (usually one IP), holding the timestamps of recent attempts.
 *
 * This runs per serverless instance, so it slows down a single
 * source rather than stopping a distributed attack — the honest
 * limit is documented in the redesign plan, and a shared store
 * (Upstash Redis, free tier) is the later upgrade. */
const hits = new Map<string, number[]>();

/** True when this key has already hit its limit inside the window.
 * A hit that is allowed is recorded, so the next call counts it. */
export function isRateLimited(key: string, limit: number, windowMs: number, now = Date.now()): boolean {
  const recent = (hits.get(key) ?? []).filter((t) => now - t < windowMs);
  if (recent.length >= limit) {
    hits.set(key, recent);
    return true;
  }
  recent.push(now);
  hits.set(key, recent);
  return false;
}

/** The caller's IP, from the first forwarded address when the app
 * sits behind Vercel's proxy. */
export function clientIp(req: Request): string {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
}
