import { afterEach, describe, expect, it } from "vitest";
import { buildAuthorizationUrl } from "./oauth";

afterEach(() => {
  delete process.env.GOOGLE_CLIENT_ID;
  delete process.env.GITHUB_CLIENT_ID;
});

describe("buildAuthorizationUrl", () => {
  it("builds a Google URL with the openid scope and the state", () => {
    process.env.GOOGLE_CLIENT_ID = "google-id";
    const url = new URL(buildAuthorizationUrl("google", "https://app.example/oauth/callback", "state-1"));
    expect(url.hostname).toBe("accounts.google.com");
    expect(url.searchParams.get("client_id")).toBe("google-id");
    expect(url.searchParams.get("scope")).toBe("openid email profile");
    expect(url.searchParams.get("state")).toBe("state-1");
    expect(url.searchParams.get("redirect_uri")).toBe("https://app.example/oauth/callback");
  });

  it("builds a GitHub URL asking only for email scope", () => {
    process.env.GITHUB_CLIENT_ID = "github-id";
    const url = new URL(buildAuthorizationUrl("github", "https://app.example/oauth/callback", "state-2"));
    expect(url.hostname).toBe("github.com");
    expect(url.searchParams.get("scope")).toBe("user:email");
    expect(url.searchParams.get("state")).toBe("state-2");
  });
});
