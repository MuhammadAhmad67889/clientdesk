import { describe, expect, it } from "vitest";
import {
  hashPassword,
  signSessionCookie,
  validateCredentials,
  verifyPassword,
  verifySessionCookie,
} from "./auth";
import { validatePasswordChange } from "./validation";

const SECRET = "test-only-secret-for-unit-tests";

describe("hashPassword / verifyPassword", () => {
  it("verifies the correct password and rejects a wrong one", () => {
    const hash = hashPassword("correct horse 1");
    expect(verifyPassword("correct horse 1", hash)).toBe(true);
    expect(verifyPassword("wrong password", hash)).toBe(false);
  });

  it("never stores the plaintext password and salts each hash", () => {
    const hash = hashPassword("same-password-123");
    expect(hash).not.toContain("same-password-123");
    expect(hashPassword("same-password-123")).not.toBe(hash);
  });

  it("rejects malformed stored values", () => {
    expect(verifyPassword("anything", "not-a-hash")).toBe(false);
    expect(verifyPassword("anything", "")).toBe(false);
  });
});

describe("signSessionCookie / verifySessionCookie", () => {
  it("round-trips a session id and token", () => {
    const cookie = signSessionCookie("sess-1", "tok-abc", SECRET);
    expect(verifySessionCookie(cookie, SECRET)).toEqual({ sessionId: "sess-1", token: "tok-abc" });
  });

  it("rejects a tampered payload and a wrong secret", () => {
    const cookie = signSessionCookie("sess-1", "tok-abc", SECRET);
    const tampered = `${cookie.slice(0, -2)}00`;
    expect(verifySessionCookie(tampered, SECRET)).toBeNull();
    expect(verifySessionCookie(cookie, "different-secret")).toBeNull();
    expect(verifySessionCookie(undefined, SECRET)).toBeNull();
    expect(verifySessionCookie("", SECRET)).toBeNull();
  });

  it("rejects a cookie when no secret is available instead of throwing", () => {
    const cookie = signSessionCookie("sess-1", "tok-abc", SECRET);
    expect(verifySessionCookie(cookie, "")).toBeNull();
  });
});

describe("validateCredentials", () => {
  it("requires a valid email and a password of at least 8 characters", () => {
    expect(validateCredentials({ email: "not-an-email", password: "short" })).toEqual({
      email: "Enter a valid email address.",
      password: "Password must be at least 8 characters.",
    });
    expect(validateCredentials({ email: "a@example.com", password: "long-enough" })).toEqual({});
  });
});

describe("validatePasswordChange", () => {
  it("requires a current password, 8+ new characters, and a matching confirmation", () => {
    expect(validatePasswordChange({ confirmPassword: "new-pass-1", currentPassword: "", newPassword: "new-pass-1" })).toHaveProperty("currentPassword");
    expect(validatePasswordChange({ confirmPassword: "short", currentPassword: "old-pass-1", newPassword: "short" })).toHaveProperty("newPassword");
    expect(validatePasswordChange({ confirmPassword: "different-1", currentPassword: "old-pass-1", newPassword: "new-pass-1" })).toHaveProperty("confirmPassword");
    expect(validatePasswordChange({ confirmPassword: "new-pass-1", currentPassword: "old-pass-1", newPassword: "new-pass-1" })).toEqual({});
  });
});
