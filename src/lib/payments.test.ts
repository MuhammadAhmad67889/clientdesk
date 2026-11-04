import { describe, expect, it } from "vitest";
import { buildPaymentRows, remainingByInvoice, summarizePaymentRows } from "./payments";
import type { Client, Invoice, Payment } from "./types";

function invoice(partial: Partial<Invoice> & { id: string }): Invoice {
  return {
    amount: 100,
    clientId: "c1",
    description: "Work",
    discountRate: 0,
    dueDate: "2026-11-30",
    issuedDate: "2026-11-05",
    number: 1,
    status: "unpaid",
    taxRate: 0,
    ...partial,
  };
}

function payment(partial: Partial<Payment> & { id: string }): Payment {
  return {
    amount: 40,
    invoiceId: "i1",
    paidAt: "2026-11-06",
    userId: "u1",
    ...partial,
  };
}

const clients: Client[] = [
  { archived: false, createdAt: "2026-10-01", email: "a@example.com", id: "c1", name: "Ana" },
];

describe("buildPaymentRows", () => {
  it("turns payments into completed rows and unpaid balances into pending rows", () => {
    const invoices = [
      invoice({ amount: 100, id: "i1", number: 1 }),
      invoice({ amount: 50, id: "i2", number: 2, status: "paid" }),
    ];
    const payments = [
      payment({ amount: 40, id: "p1", invoiceId: "i1", method: "Bank transfer", paidAt: "2026-11-06", reference: "REF-1" }),
      payment({ amount: 50, id: "p2", invoiceId: "i2", paidAt: "2026-11-02" }),
    ];
    const rows = buildPaymentRows(payments, invoices, clients);
    // i1 still owes 60, so it gets a pending row; i2 is fully paid.
    expect(rows.map((r) => [r.kind, r.amount, r.date])).toEqual([
      ["pending", 60, "2026-11-30"],
      ["payment", 40, "2026-11-06"],
      ["payment", 50, "2026-11-02"],
    ]);
    const completed = rows.find((r) => r.kind === "payment" && r.amount === 40)!;
    expect(completed.invoiceNumber).toBe("INV-001");
    expect(completed.clientName).toBe("Ana");
    expect(completed.method).toBe("Bank transfer");
    expect(completed.reference).toBe("REF-1");
    expect(summarizePaymentRows(rows)).toEqual({ pending: 60, received: 90 });
  });

  it("never shows a pending row for a fully paid invoice", () => {
    const rows = buildPaymentRows(
      [payment({ amount: 100, id: "p1", invoiceId: "i1" })],
      [invoice({ amount: 100, id: "i1", status: "paid" })],
      clients,
    );
    expect(rows).toHaveLength(1);
    expect(rows[0].kind).toBe("payment");
  });
});

describe("remainingByInvoice", () => {
  it("maps each invoice to what it still owes", () => {
    const remaining = remainingByInvoice(
      [invoice({ amount: 100, id: "i1" })],
      [payment({ amount: 40, id: "p1", invoiceId: "i1" })],
    );
    expect(remaining.get("i1")).toBe(60);
  });
});
