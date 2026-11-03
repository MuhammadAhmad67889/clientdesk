import { describe, expect, it } from "vitest";
import { FREE_CLIENT_LIMIT, FREE_INVOICE_LIMIT, freeLimitMessage, normalizePlan, planAllowsCreate } from "./plans";

describe("plans", () => {
  it("normalizes unknown and missing plans to free", () => {
    expect(normalizePlan(undefined)).toBe("free");
    expect(normalizePlan("something-else")).toBe("free");
    expect(normalizePlan("pro")).toBe("pro");
    expect(normalizePlan("business")).toBe("business");
  });

  it("blocks free creation at the limit and allows one below it", () => {
    expect(planAllowsCreate("free", "client", FREE_CLIENT_LIMIT - 1)).toBe(true);
    expect(planAllowsCreate("free", "client", FREE_CLIENT_LIMIT)).toBe(false);
    expect(planAllowsCreate("free", "invoice", FREE_INVOICE_LIMIT - 1)).toBe(true);
    expect(planAllowsCreate("free", "invoice", FREE_INVOICE_LIMIT)).toBe(false);
  });

  it("never limits pro or business", () => {
    expect(planAllowsCreate("pro", "client", 1000)).toBe(true);
    expect(planAllowsCreate("business", "invoice", 1000)).toBe(true);
  });

  it("states the limit and the demo-data rule in the message", () => {
    expect(freeLimitMessage("client")).toContain(String(FREE_CLIENT_LIMIT));
    expect(freeLimitMessage("client")).toContain("demo data counts");
  });
});
