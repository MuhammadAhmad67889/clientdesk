import { describe, expect, it } from "vitest";
import { buildReminderDraft, parseInvoiceDraft, rankClientsByOutstanding, summarizeMonth } from "./drafts";
import type { Client, Invoice, Payment } from "./types";

const clients: Client[] = [
  { createdAt: "2026-11-01", id: "c1", name: "Acme Studio" },
  { createdAt: "2026-11-01", id: "c2", name: "Acme" },
];

function invoice(overrides: Partial<Invoice>): Invoice {
  return {
    amount: 100,
    clientId: "c1",
    description: "Work",
    discountRate: 0,
    dueDate: "2026-11-10",
    id: "i1",
    issuedDate: "2026-11-01",
    number: 1,
    status: "unpaid",
    taxRate: 0,
    ...overrides,
  };
}

describe("parseInvoiceDraft", () => {
  it("takes the largest currency-marked amount and the longest matching client name", () => {
    const draft = parseInvoiceDraft("Website work for Acme Studio\nDeposit $200, total $1200 due 2026-12-01", clients);
    expect(draft.amount).toBe(1200);
    expect(draft.clientId).toBe("c1");
    expect(draft.dueDate).toBe("2026-12-01");
    expect(draft.description).toBe("Website work for Acme Studio");
  });

  it("converts DD/MM/YYYY and falls back to a bare total line", () => {
    const draft = parseInvoiceDraft("Logo design\nTotal: 450\nDue 15/12/2026", clients);
    expect(draft.amount).toBe(450);
    expect(draft.dueDate).toBe("2026-12-15");
  });

  it("leaves fields empty instead of inventing them, and rejects impossible dates", () => {
    const draft = parseInvoiceDraft("Just a note\nDue 2026-02-30", clients);
    expect(draft.amount).toBeNull();
    expect(draft.clientId).toBeNull();
    expect(draft.dueDate).toBeNull();
  });
});

describe("buildReminderDraft", () => {
  it("states the overdue days and the real figures", () => {
    const draft = buildReminderDraft({
      balance: 60,
      clientName: "Acme Studio",
      dueDate: "2026-11-01",
      invoiceNumber: "INV-001",
      paid: 40,
      today: "2026-11-04",
      total: 100,
    });
    expect(draft.subject).toContain("INV-001");
    expect(draft.body).toContain("3 days past");
    expect(draft.body).toContain("$60.00 still outstanding");
  });

  it("uses the due-date wording when not yet overdue", () => {
    const draft = buildReminderDraft({
      balance: 100,
      clientName: "Acme Studio",
      dueDate: "2026-11-10",
      invoiceNumber: "INV-001",
      paid: 0,
      today: "2026-11-04",
      total: 100,
    });
    expect(draft.body).toContain("due on 2026-11-10");
  });
});

describe("summarizeMonth", () => {
  it("counts only the month's invoices and payments", () => {
    const invoices = [
      invoice({ id: "i1", issuedDate: "2026-11-02" }),
      invoice({ amount: 50, id: "i2", issuedDate: "2026-10-05" }),
    ];
    const payments: Payment[] = [
      { amount: 40, id: "p1", invoiceId: "i1", paidAt: "2026-11-03", userId: "u1" },
      { amount: 50, id: "p2", invoiceId: "i2", paidAt: "2026-11-03", userId: "u1" },
    ];
    const summary = summarizeMonth(invoices, payments, "2026-11", "2026-11-04");
    expect(summary.billed).toBe(100);
    expect(summary.paid).toBe(90);
    expect(summary.outstanding).toBe(60);
    expect(summary.count).toBe(1);
  });
});

describe("rankClientsByOutstanding", () => {
  it("sorts largest outstanding first and drops zero balances", () => {
    const invoices = [invoice({ amount: 100, clientId: "c1", id: "i1" }), invoice({ amount: 300, clientId: "c2", id: "i2" })];
    const ranked = rankClientsByOutstanding(clients, invoices, []);
    expect(ranked.map((r) => r.client.id)).toEqual(["c2", "c1"]);
    expect(ranked[0].outstanding).toBe(300);
  });
});
