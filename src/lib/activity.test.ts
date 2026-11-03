import { describe, expect, it } from "vitest";
import { buildActivity } from "./activity";
import type { Client, Invoice, Payment } from "./types";

const client: Client = {
  archived: false,
  createdAt: "2026-11-01",
  id: "c1",
  name: "Acme",
};
const invoice: Invoice = {
  amount: 100,
  clientId: "c1",
  description: "Work",
  discountRate: 0,
  dueDate: "2026-11-15",
  id: "i1",
  issuedDate: "2026-11-02",
  number: 3,
  status: "unpaid",
  taxRate: 0,
};
const payment: Payment = {
  amount: 40,
  id: "p1",
  invoiceId: "i1",
  paidAt: "2026-11-03",
  userId: "u1",
};

describe("buildActivity", () => {
  it("orders newest first and names the client and invoice number", () => {
    const items = buildActivity([client], [invoice], [payment]);
    expect(items.map((i) => i.date)).toEqual(["2026-11-03", "2026-11-02", "2026-11-01"]);
    expect(items[0].text).toBe("Payment $40.00 recorded for invoice INV-003");
    expect(items[1].text).toBe("Invoice INV-003 created for Acme — $100.00");
    expect(items[2].text).toBe("Client Acme added");
  });

  it("caps the list and falls back gracefully for an unknown invoice", () => {
    const orphan: Payment = { ...payment, invoiceId: "missing", paidAt: "2026-11-04" };
    const items = buildActivity([client], [invoice], [payment, orphan], 2);
    expect(items).toHaveLength(2);
    expect(items[0].text).toBe("Payment $40.00 recorded for an invoice");
  });
});
