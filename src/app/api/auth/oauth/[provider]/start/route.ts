import { NextRequest, NextResponse } from "next/server";
import {
  buildAuthorizationUrl,
  isOAuthConfigured,
  newStateToken,
  oauthRedirectUri,
  type OAuthProvider,
} from "../../../../../../lib/oauth";

const PROVIDERS: OAuthProvider[] = ["github", "google"];

/** Step one of sign-in: redirect to the provider with a one-time
 * state value saved in a short-lived cookie for the callback to
 * compare. Unconfigured providers answer 503 instead of linking
 * anywhere — the buttons only render when configured, so this path
 * is only reached by typing the URL directly. */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ provider: string }> },
) {
  const { provider } = await params;
  if (!PROVIDERS.includes(provider as OAuthProvider)) {
    return NextResponse.json({ error: "Unknown provider." }, { status: 404 });
  }
  const name = provider as OAuthProvider;
  if (!isOAuthConfigured(name)) {
    return NextResponse.json({ error: "This sign-in method is not set up yet." }, { status: 503 });
  }
  const state = newStateToken();
  const res = NextResponse.redirect(
    buildAuthorizationUrl(name, oauthRedirectUri(req, name), state),
  );
  res.cookies.set("oauth_state", state, {
    httpOnly: true,
    maxAge: 600,
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });
  return res;
}
