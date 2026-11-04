/** Same-origin check for cookie-authenticated API requests.
 *
 * Browsers always send an Origin header on POST, PUT, PATCH and
 * DELETE, so a request carrying an Origin or Referer from another
 * site is a cross-site forgery attempt and is rejected. A request
 * with neither header is not from a browser at all (curl, a server),
 * so it is allowed through — it still needs a valid session cookie
 * to do anything. */
export function isSameOriginRequest(
  origin: string | null,
  referer: string | null,
  host: string | null,
): boolean {
  const candidate = origin || referer;
  if (!candidate) return true;
  if (!host) return false;
  try {
    return new URL(candidate).host === host;
  } catch {
    return false;
  }
}
