import { randomBytes } from "crypto";

/** Google and GitHub sign-in, as a manual authorization-code flow
 * on top of the existing session system — no new auth library.
 * Buttons only render for providers whose client id and secret are
 * set, so an unconfigured provider never appears as a dead button.
 * OAuth-created accounts get a random unusable password hash, so
 * they sign in through OAuth only until a password is set later. */
export type OAuthProvider = "github" | "google";

export function isOAuthConfigured(provider: OAuthProvider): boolean {
  if (provider === "google") {
    return Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
  }
  return Boolean(process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET);
}

export function oauthRedirectUri(req: Request, provider: OAuthProvider): string {
  return `${new URL(req.url).origin}/api/auth/oauth/${provider}/callback`;
}

/** A one-time value stored in a short-lived cookie and compared on
 * callback, so a login cannot be started by another site. */
export function newStateToken(): string {
  return randomBytes(16).toString("hex");
}

export function buildAuthorizationUrl(
  provider: OAuthProvider,
  redirectUri: string,
  state: string,
): string {
  if (provider === "google") {
    const params = new URLSearchParams({
      access_type: "online",
      client_id: process.env.GOOGLE_CLIENT_ID ?? "",
      prompt: "select_account",
      redirect_uri: redirectUri,
      response_type: "code",
      scope: "openid email profile",
      state,
    });
    return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
  }
  const params = new URLSearchParams({
    client_id: process.env.GITHUB_CLIENT_ID ?? "",
    redirect_uri: redirectUri,
    scope: "user:email",
    state,
  });
  return `https://github.com/login/oauth/authorize?${params.toString()}`;
}
