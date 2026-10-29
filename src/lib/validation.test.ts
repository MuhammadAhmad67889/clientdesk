import { describe, expect, it } from "vitest";
import { isValidDate, isValidEmail, validateClient, validateInvoice } from "./validation";

describe("validateClient", () => {
  it("requires a name", () => {
    expect(validateClient({ name: "  " }).name).toBeDefined();
    expect(validateClient({ name: "Sara" })).toEqual({});
  });
  it("allows blank email but rejects a bad email", () => {
    expect(validateClient({ email: "", name: "Sara" })).toEqual({});
    expect(validateClient({ email: "not-an-email", name: "Sara" }).email).toBeDefined();
    expect(validateClient({ email: "sara@example.com", name: "Sara" })).toEqual({});
  });
});

describe("validateInvoice", () => {
  const valid = { amount: 100, clientId: "c1", description: "Work", dueDate: "2026-11-01" };
  it("accepts a valid invoice", () => {
    expect(validateInvoice(valid)).toEqual({});
  });
  it("rejects zero, negative, and non-finite amounts", () => {
    expect(validateInvoice({ ...valid, amount: 0 }).amount).toBeDefined();
    expect(validateInvoice({ ...valid, amount: -5 }).amount).toBeDefined();
    expect(validateInvoice({ ...valid, amount: Number.NaN }).amount).toBeDefined();
  });
  it("requires client, description, and a valid due date", () => {
    expect(validateInvoice({ ...valid, clientId: "" }).clientId).toBeDefined();
    expect(validateInvoice({ ...valid, description: " " }).description).toBeDefined();
    expect(validateInvoice({ ...valid, dueDate: "" }).dueDate).toBeDefined();
    expect(validateInvoice({ ...valid, dueDate: "not-a-date" }).dueDate).toBeDefined();
  });
});

describe("isValidDate", () => {
  it("rejects dates that do not exist, like 30 February", () => {
    // Date.parse rolls 2026-02-30 over to 2 March, so this has to be
    // checked against the calendar, not just parsed.
    expect(isValidDate("2026-02-30")).toBe(false);
    expect(isValidDate("2026-13-01")).toBe(false);
    expect(isValidDate("2026-02-28")).toBe(true);
    expect(isValidDate("2024-02-29")).toBe(true);
    expect(validateInvoice({ amount: 100, clientId: "c1", description: "Work", dueDate: "2026-02-30" }).dueDate).toBeDefined();
  });
});

describe("isValidEmail", () => {
  it("accepts normal addresses and rejects malformed ones", () => {
    expect(isValidEmail("sara@example.com")).toBe(true);
    expect(isValidEmail("sara@")).toBe(false);
    expect(isValidEmail("sara example.com")).toBe(false);
  });
});
