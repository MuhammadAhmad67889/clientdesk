import { describe, expect, it } from "vitest";
import { planFromSubscriptionStatus } from "./billing";

describe("planFromSubscriptionStatus", () => {
  it("keeps Pro for active, trialing, and past_due", () => {
    expect(planFromSubscriptionStatus("active")).toBe("pro");
    expect(planFromSubscriptionStatus("trialing")).toBe("pro");
    expect(planFromSubscriptionStatus("past_due")).toBe("pro");
  });

  it("drops to free for ended and failed states", () => {
    for (const status of ["canceled", "unpaid", "incomplete", "incomplete_expired", "paused", null, undefined, ""]) {
      expect(planFromSubscriptionStatus(status)).toBe("free");
    }
  });

  it("does not grant Pro for an unknown status", () => {
    expect(planFromSubscriptionStatus("something-new")).toBe("free");
  });
});
