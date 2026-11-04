import { describe, expect, it } from "vitest";
import { buildUserExport } from "./exportData";
import type { Client, Invoice, Payment, RecurringTemplate } from "./types";

describe("buildUserExport", () => {
  it("bundles the user's own lists and nothing else", () => {
    const clients = [{ id: "c1", name: "Acme" }] as Client[];
    const invoices = [{ id: "i1", description: "Design work" }] as Invoice[];
    const payments = [{ id: "p1", amount: 50 }] as Payment[];
    const recurringTemplates = [{ id: "r1", description: "Retainer" }] as RecurringTemplate[];
    const result = buildUserExport({
      clients,
      email: "owner@example.com",
      invoices,
      payments,
      recurringTemplates,
    });
    expect(result.clients).toEqual(clients);
    expect(result.invoices).toEqual(invoices);
    expect(result.payments).toEqual(payments);
    expect(result.recurringTemplates).toEqual(recurringTemplates);
    expect(result.user).toEqual({ email: "owner@example.com" });
    expect(typeof result.exportedAt).toBe("string");
    expect(Object.keys(result).sort()).toEqual([
      "clients",
      "exportedAt",
      "invoices",
      "payments",
      "recurringTemplates",
      "user",
    ]);
  });
});
