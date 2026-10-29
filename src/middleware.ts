import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE } from "./lib/cookie-name";

/**
 * Presence check only: the cookie must exist to reach protected pages.
 * The session itself is verified server-side (HMAC + hashed token + expiry)
 * in every API handler and server page, so a forged/expired cookie alone
 * grants nothing.
 */
export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const hasCookie = Boolean(req.cookies.get(SESSION_COOKIE)?.value);
  const isProtected =
    pathname === "/" || pathname.startsWith("/clients") || pathname.startsWith("/invoices");
  if (isProtected && !hasCookie) {
    return NextResponse.redirect(new URL("/login", req.url));
  }
  if ((pathname === "/login" || pathname === "/signup") && hasCookie) {
    return NextResponse.redirect(new URL("/", req.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/", "/clients/:path*", "/invoices/:path*", "/login", "/signup"],
};
