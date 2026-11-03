import { randomBytes } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import {
  hashEquals,
  hashPassword,
  normalizeEmail,
} from "../../../../../../lib/auth";
import { seedDemoForUser } from "../../../../../../lib/data";
import { oauthRedirectUri, type OAuthProvider } from "../../../../../../lib/oauth";
import { getPrisma } from "../../../../../../lib/prisma";
import { createSession, setSessionCookie } from "../../../../../../lib/session-cookie";

const PROVIDERS: OAuthProvider[] = ["github", "google"];

/** Step two of sign-in: check the state, exchange the code, and
 * fetch the verified email. The account is then found by provider
 * id, linked by email, or created with demo data — exactly like
 * email signup — and signed in with the usual session cookie. */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ provider: string }> },
) {
  const { provider } = await params;
  if (!PROVIDERS.includes(provider as OAuthProvider)) {
    return NextResponse.json({ error: "Unknown provider." }, { status: 404 });
  }
  const name = provider as OAuthProvider;
  const url = new URL(req.url);
  const code = url.searchParams.get("code") ?? "";
  const state = url.searchParams.get("state") ?? "";
  const savedState = req.cookies.get("oauth_state")?.value ?? "";
  const fail = (reason: string) => NextResponse.redirect(new URL(`/login?oauth=${reason}`, url.origin));
  if (!code || !state || !savedState || !hashEquals(state, savedState)) {
    return fail("state");
  }

  const redirectUri = oauthRedirectUri(req, name);
  let profile: { email: string; providerId: string } | null = null;
  try {
    profile = name === "google"
      ? await googleProfile(code, redirectUri)
      : await githubProfile(code, redirectUri);
  } catch (err) {
    console.error(`OAuth ${name} failed:`, err);
    return fail("failed");
  }
  if (!profile) return fail("email");

  const db = getPrisma();
  let user = name === "google"
    ? await db.user.findUnique({ where: { googleId: profile.providerId } })
    : await db.user.findUnique({ where: { githubId: profile.providerId } });
  if (!user) {
    user = await db.user.findUnique({ where: { email: normalizeEmail(profile.email) } });
    if (user) {
      await db.user.update({
        data: name === "google"
          ? { googleId: profile.providerId }
          : { githubId: profile.providerId },
        where: { id: user.id },
      });
    }
  }
  if (!user) {
    // A random unusable password: this account signs in through
    // OAuth only, until a password is set for it later.
    const passwordHash = hashPassword(randomBytes(32).toString("hex"));
    let userId: string | null = null;
    try {
      const created = name === "google"
        ? await db.user.create({
            data: { email: normalizeEmail(profile.email), googleId: profile.providerId, passwordHash },
          })
        : await db.user.create({
            data: { email: normalizeEmail(profile.email), githubId: profile.providerId, passwordHash },
          });
      userId = created.id;
      await seedDemoForUser(created.id, db);
      user = created;
    } catch {
      if (userId) await db.user.delete({ where: { id: userId } }).catch(() => undefined);
      return fail("failed");
    }
  }

  const { cookieValue } = await createSession(user.id, db);
  const res = NextResponse.redirect(new URL("/", url.origin));
  setSessionCookie(res, cookieValue);
  res.cookies.set("oauth_state", "", { httpOnly: true, maxAge: 0, path: "/" });
  return res;
}

async function googleProfile(code: string, redirectUri: string) {
  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID ?? "",
      client_secret: process.env.GOOGLE_CLIENT_SECRET ?? "",
      code,
      grant_type: "authorization_code",
      redirect_uri: redirectUri,
    }),
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    method: "POST",
  });
  if (!tokenRes.ok) throw new Error("Google token exchange failed");
  const tokens = (await tokenRes.json()) as { access_token?: string };
  if (!tokens.access_token) throw new Error("Google returned no access token");
  const userRes = await fetch("https://openidconnect.googleapis.com/v1/userinfo", {
    headers: { Authorization: `Bearer ${tokens.access_token}` },
  });
  if (!userRes.ok) throw new Error("Google userinfo failed");
  const info = (await userRes.json()) as { email?: string; email_verified?: boolean; sub?: string };
  if (!info.email || info.email_verified !== true || !info.sub) return null;
  return { email: info.email, providerId: info.sub };
}

async function githubProfile(code: string, redirectUri: string) {
  const tokenRes = await fetch("https://github.com/login/oauth/access_token", {
    body: JSON.stringify({
      client_id: process.env.GITHUB_CLIENT_ID,
      client_secret: process.env.GITHUB_CLIENT_SECRET,
      code,
      redirect_uri: redirectUri,
    }),
    headers: { Accept: "application/json", "Content-Type": "application/json" },
    method: "POST",
  });
  if (!tokenRes.ok) throw new Error("GitHub token exchange failed");
  const tokens = (await tokenRes.json()) as { access_token?: string };
  if (!tokens.access_token) throw new Error("GitHub returned no access token");
  const headers = {
    Accept: "application/vnd.github+json",
    Authorization: `Bearer ${tokens.access_token}`,
    "User-Agent": "ClientDesk",
  };
  const userRes = await fetch("https://api.github.com/user", { headers });
  if (!userRes.ok) throw new Error("GitHub user failed");
  const info = (await userRes.json()) as { id?: number };
  const emailsRes = await fetch("https://api.github.com/user/emails", { headers });
  if (!emailsRes.ok) throw new Error("GitHub emails failed");
  const emails = (await emailsRes.json()) as { email: string; primary: boolean; verified: boolean }[];
  const chosen = emails.find((e) => e.primary && e.verified) ?? emails.find((e) => e.verified);
  if (!info.id || !chosen) return null;
  return { email: chosen.email, providerId: String(info.id) };
}
