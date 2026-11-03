import { describe, expect, it } from "vitest";
import { isRateLimited } from "./rateLimit";

describe("isRateLimited", () => {
  it("allows attempts up to the limit, then blocks", () => {
    expect(isRateLimited("login-test-a", 2, 60_000, 1000)).toBe(false);
    expect(isRateLimited("login-test-a", 2, 60_000, 2000)).toBe(false);
    expect(isRateLimited("login-test-a", 2, 60_000, 3000)).toBe(true);
  });

  it("lets attempts through again once the window passes", () => {
    expect(isRateLimited("login-test-b", 1, 60_000, 1000)).toBe(false);
    expect(isRateLimited("login-test-b", 1, 60_000, 2000)).toBe(true);
    expect(isRateLimited("login-test-b", 1, 60_000, 62_000)).toBe(false);
  });

  it("tracks keys independently", () => {
    expect(isRateLimited("login-test-c", 1, 60_000, 1000)).toBe(false);
    expect(isRateLimited("login-test-d", 1, 60_000, 1000)).toBe(false);
  });
});
