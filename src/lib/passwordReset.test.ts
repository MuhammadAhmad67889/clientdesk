import { describe, expect, it } from "vitest";
import { buildResetToken, hashResetToken, isResetTokenUsable } from "./passwordReset";

describe("password reset tokens", () => {
  it("hashes deterministically and differently per token", () => {
    expect(hashResetToken("abc")).toBe(hashResetToken("abc"));
    expect(hashResetToken("abc")).not.toBe(hashResetToken("abd"));
  });

  it("builds a token that expires one hour out and hashes to its hash", () => {
    const built = buildResetToken(1000);
    expect(built.token).toHaveLength(64);
    expect(built.tokenHash).toBe(hashResetToken(built.token));
    expect(built.expiresAt.getTime()).toBe(1000 + 60 * 60 * 1000);
  });

  it("is usable only while unused and unexpired", () => {
    const fresh = { expiresAt: new Date(5000), usedAt: null };
    expect(isResetTokenUsable(fresh, 4000)).toBe(true);
    expect(isResetTokenUsable(fresh, 5000)).toBe(false);
    expect(isResetTokenUsable({ expiresAt: new Date(5000), usedAt: new Date(2000) }, 3000)).toBe(false);
  });
});
