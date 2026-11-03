import { NextResponse } from "next/server";
import { isOAuthConfigured } from "../../../../lib/oauth";

/** Which OAuth buttons the login and signup pages should show.
 * Booleans only — no secrets ever leave the server. */
export async function GET() {
  return NextResponse.json({
    github: isOAuthConfigured("github"),
    google: isOAuthConfigured("google"),
  });
}
