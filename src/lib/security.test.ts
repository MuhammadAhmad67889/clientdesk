import { describe, expect, it } from "vitest";
import { isSameOriginRequest } from "./security";

describe("isSameOriginRequest", () => {
  it("allows a request whose Origin matches the host", () => {
    expect(isSameOriginRequest("https://clientdesk.example.com", null, "clientdesk.example.com")).toBe(true);
  });

  it("rejects a request whose Origin is another site", () => {
    expect(isSameOriginRequest("https://evil.example.com", null, "clientdesk.example.com")).toBe(false);
  });

  it("falls back to the Referer when no Origin is sent", () => {
    expect(isSameOriginRequest(null, "https://clientdesk.example.com/invoices", "clientdesk.example.com")).toBe(true);
    expect(isSameOriginRequest(null, "https://evil.example.com/", "clientdesk.example.com")).toBe(false);
  });

  it("allows requests with neither header, since those are not from a browser", () => {
    expect(isSameOriginRequest(null, null, "clientdesk.example.com")).toBe(true);
  });

  it("rejects an unparseable Origin and an unverifiable host", () => {
    expect(isSameOriginRequest("not-a-url", null, "clientdesk.example.com")).toBe(false);
    expect(isSameOriginRequest("https://clientdesk.example.com", null, null)).toBe(false);
  });
});
