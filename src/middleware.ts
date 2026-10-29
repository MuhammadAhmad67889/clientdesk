import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE } from "./lib/cookie-name";

// Only checks the cookie exists. The session itself is checked on the
// server in every page and API route, so a forged or expired cookie
// gets nothing here. Deliberately no redirect from /login when a
// cookie exists: an expired cookie would bounce / <-> /login forever.
export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const hasCookie = Boolean(req.cookies.get(SESSION_COOKIE)?.value);
  const isProtected =
    pathname === "/" || pathname.startsWith("/clients") || pathname.startsWith("/invoices");
  if (isProtected && !hasCookie) {
    return NextResponse.redirect(new URL("/login", req.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/", "/clients/:path*", "/invoices/:path*", "/login", "/signup"],
};
