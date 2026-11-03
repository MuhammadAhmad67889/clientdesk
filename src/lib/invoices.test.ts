import { describe, expect, it } from "vitest";
import {
  applyInvoiceEdit,
  applyPaymentDeletion,
  buildDuplicateInput,
  computeClientTotals,
  outstandingByClient,
  computeRemainingBalance,
  computeInvoiceTotal,
  formatInvoiceNumber,
  computeTotals,
  filterClients,
  filterInvoices,
  isOverdue,
  seedData,
  sortInvoicesRecent,
} from "./invoices";
import type { Client, Invoice } from "./types";

const TODAY = "2026-10-29";
const clients: Client[] = [
  { createdAt: "2026-10-01", email: "a@example.com", id: "c1", name: "Sara Khan" },
  { createdAt: "2026-10-02", id: "c2", name: "Omar Raza" },
];
function inv(partial: Partial<Invoice> & { id: string }): Invoice {
  return {
    amount: 100,
    clientId: "c1",
    description: "Work",
    discountRate: 0,
    dueDate: "2026-11-01",
    issuedDate: "2026-10-20",
    number: null,
    status: "unpaid",
    taxRate: 0,
    ...partial,
  };
}

describe("isOverdue", () => {
  it("unpaid invoice past its due date is overdue", () => {
    expect(isOverdue(inv({ dueDate: "2026-10-28", id: "1" }), TODAY)).toBe(true);
  });
  it("unpaid invoice due today is not overdue", () => {
    expect(isOverdue(inv({ dueDate: TODAY, id: "1" }), TODAY)).toBe(false);
  });
  it("unpaid invoice due in future is not overdue", () => {
    expect(isOverdue(inv({ dueDate: "2026-10-30", id: "1" }), TODAY)).toBe(false);
  });
  it("paid invoice past its due date is not overdue", () => {
    expect(isOverdue(inv({ dueDate: "2026-10-01", id: "1", status: "paid" }), TODAY)).toBe(false);
  });
});

describe("formatInvoiceNumber", () => {
  it("pads to three digits and grows past 999", () => {
    expect(formatInvoiceNumber(1)).toBe("INV-001");
    expect(formatInvoiceNumber(42)).toBe("INV-042");
    expect(formatInvoiceNumber(1000)).toBe("INV-1000");
  });
  it("shows a dash for pre-numbering invoices", () => {
    expect(formatInvoiceNumber(null)).toBe("—");
  });
});

describe("computeInvoiceTotal", () => {
  it("is the amount with no tax or discount", () => {
    expect(computeInvoiceTotal(inv({ id: "1" }))).toBe(100);
  });
  it("applies discount first, then tax on the discounted amount", () => {
    // 200 − 10% = 180, then + 10% tax = 198.
    expect(computeInvoiceTotal(inv({ amount: 200, discountRate: 10, id: "1", taxRate: 10 }))).toBe(198);
  });
  it("rounds to cents", () => {
    expect(computeInvoiceTotal(inv({ amount: 99.99, id: "1", taxRate: 7.5 }))).toBe(107.49);
  });
});

describe("computeRemainingBalance", () => {
  const payments = [
    { amount: 40, id: "p1", invoiceId: "1", paidAt: "2026-11-01", userId: "u1" },
    { amount: 10, id: "p2", invoiceId: "1", paidAt: "2026-11-02", userId: "u1" },
  ];
  it("subtracts recorded payments from the invoice total", () => {
    expect(computeRemainingBalance(inv({ amount: 200, discountRate: 10, id: "1", taxRate: 10 }), payments)).toBe(148);
  });
  it("never goes below zero", () => {
    expect(computeRemainingBalance(inv({ id: "1" }), [{ ...payments[0], amount: 150 }])).toBe(0);
  });
});

describe("applyInvoiceEdit", () => {
  const edit = { amount: 300, description: "Revised work", discountRate: 0, dueDate: "2026-12-01", taxRate: 0 };
  const payments = [{ amount: 300, id: "p1", invoiceId: "1", paidAt: "2026-10-20", userId: "u1" }];
  it("marks the invoice paid when payments cover the new total", () => {
    expect(applyInvoiceEdit(inv({ amount: 400, id: "1" }), payments, edit).status).toBe("paid");
  });
  it("leaves an unpaid invoice unpaid when payments fall short", () => {
    expect(applyInvoiceEdit(inv({ amount: 400, id: "1" }), [], edit).status).toBe("unpaid");
  });
  it("never changes number, client or issued date", () => {
    const updated = applyInvoiceEdit(inv({ amount: 400, id: "1", number: 7 }), [], edit);
    expect(updated.number).toBe(7);
    expect(updated.clientId).toBe("c1");
    expect(updated.issuedDate).toBe("2026-10-20");
    expect(updated.description).toBe("Revised work");
  });
});

describe("applyPaymentDeletion", () => {
  it("drops a paid invoice back to unpaid when payments no longer cover it", () => {
    const updated = applyPaymentDeletion(inv({ amount: 400, id: "1", status: "paid" }), []);
    expect(updated.status).toBe("unpaid");
  });
  it("keeps a paid invoice paid when remaining payments still cover it", () => {
    const updated = applyPaymentDeletion(
      inv({ amount: 400, id: "1", status: "paid" }),
      [{ amount: 400, id: "p1", invoiceId: "1", paidAt: "2026-10-20", userId: "u1" }],
    );
    expect(updated.status).toBe("paid");
  });
  it("leaves an unpaid invoice unpaid", () => {
    expect(applyPaymentDeletion(inv({ amount: 400, id: "1" }), []).status).toBe("unpaid");
  });
});

describe("buildDuplicateInput", () => {
  it("copies terms but forces unpaid and drops identity fields", () => {
    const input = buildDuplicateInput(inv({ amount: 400, discountRate: 10, id: "1", number: 7, status: "paid", taxRate: 5 }));
    expect(input).toEqual({ amount: 400, clientId: "c1", description: "Work", discountRate: 10, dueDate: "2026-11-01", status: "unpaid", taxRate: 5 });
    expect(input).not.toHaveProperty("id");
    expect(input).not.toHaveProperty("number");
  });
});

describe("outstandingByClient", () => {
  it("sums remaining balances per client, reduced by payments", () => {
    const out = outstandingByClient(
      [inv({ amount: 400, clientId: "c1", id: "1" }), inv({ amount: 200, clientId: "c2", id: "2" })],
      [{ amount: 100, id: "p1", invoiceId: "1", paidAt: "2026-10-20", userId: "u1" }],
    );
    expect(out).toEqual({ c1: 300, c2: 200 });
  });
  it("returns an empty object for no invoices", () => {
    expect(outstandingByClient([], [])).toEqual({});
  });
});

describe("computeClientTotals", () => {
  const payments = [
    { amount: 100, id: "p1", invoiceId: "1", paidAt: "2026-10-20", userId: "u1" },
  ];
  it("counts part-paid invoices as part-paid, not fully outstanding", () => {
    const totals = computeClientTotals([inv({ amount: 400, id: "1" })], payments, "2026-10-29");
    expect(totals).toEqual({ overdueAmount: 0, overdueCount: 0, totalBilled: 400, totalOutstanding: 300, totalPaid: 100 });
  });
  it("counts only the remaining balance of overdue invoices", () => {
    const totals = computeClientTotals(
      [inv({ amount: 400, dueDate: "2026-10-01", id: "1" })],
      payments,
      "2026-10-29",
    );
    expect(totals.overdueCount).toBe(1);
    expect(totals.overdueAmount).toBe(300);
  });
  it("ignores payments for other invoices", () => {
    const totals = computeClientTotals([inv({ amount: 400, id: "2" })], payments, "2026-10-29");
    expect(totals.totalPaid).toBe(0);
    expect(totals.totalOutstanding).toBe(400);
  });
  it("sums across several invoices, like a dashboard", () => {
    const totals = computeClientTotals(
      [inv({ amount: 400, id: "1" }), inv({ amount: 200, dueDate: "2026-10-01", id: "2" })],
      payments,
      "2026-10-29",
    );
    expect(totals).toEqual({ overdueAmount: 200, overdueCount: 1, totalBilled: 600, totalOutstanding: 500, totalPaid: 100 });
  });
});

describe("computeTotals", () => {
  it("sums paid and outstanding separately and counts overdue", () => {
    const invoices = [
      inv({ amount: 200, dueDate: "2026-10-28", id: "1" }),
      inv({ amount: 150, dueDate: "2026-11-05", id: "2" }),
      inv({ amount: 300, dueDate: "2026-10-01", id: "3", status: "paid" }),
    ];
    const totals = computeTotals(invoices, clients, TODAY);
    expect(totals.totalPaid).toBe(300);
    expect(totals.totalOutstanding).toBe(350);
    expect(totals.overdueCount).toBe(1);
    expect(totals.overdueAmount).toBe(200);
    expect(totals.clientCount).toBe(2);
    expect(totals.invoiceCount).toBe(3);
  });
  it("returns zeros for no invoices", () => {
    expect(computeTotals([], [], TODAY)).toEqual({
      clientCount: 0,
      invoiceCount: 0,
      overdueAmount: 0,
      overdueCount: 0,
      totalOutstanding: 0,
      totalPaid: 0,
    });
  });
});

describe("filterInvoices", () => {
  const invoices = [
    inv({ description: "Website build", dueDate: "2026-10-28", id: "1" }),
    inv({ description: "Logo update", dueDate: "2026-11-05", id: "2", status: "paid" }),
  ];
  it("filters by overdue derived status", () => {
    expect(filterInvoices(invoices, clients, "", "overdue", TODAY).map((i) => i.id)).toEqual(["1"]);
  });
  it("filters by paid and unpaid", () => {
    expect(filterInvoices(invoices, clients, "", "paid", TODAY).map((i) => i.id)).toEqual(["2"]);
    expect(filterInvoices(invoices, clients, "", "unpaid", TODAY).map((i) => i.id)).toEqual(["1"]);
  });
  it("searches description and client name case-insensitively", () => {
    expect(filterInvoices(invoices, clients, "WEBSITE", "all", TODAY).map((i) => i.id)).toEqual(["1"]);
    expect(filterInvoices(invoices, clients, "sara", "all", TODAY).map((i) => i.id)).toEqual(["1", "2"]);
  });
  it("filters by due-date window, bounds inclusive", () => {
    expect(filterInvoices(invoices, clients, "", "all", TODAY, { dueFrom: "2026-11-01" }).map((i) => i.id)).toEqual(["2"]);
    expect(filterInvoices(invoices, clients, "", "all", TODAY, { dueTo: "2026-10-31" }).map((i) => i.id)).toEqual(["1"]);
    expect(filterInvoices(invoices, clients, "", "all", TODAY, { dueFrom: "2026-10-28", dueTo: "2026-10-28" }).map((i) => i.id)).toEqual(["1"]);
    expect(filterInvoices(invoices, clients, "", "all", TODAY, { dueFrom: "2026-11-05", dueTo: "2026-11-05" }).map((i) => i.id)).toEqual(["2"]);
  });
  it("empty due bounds mean no bound, and combine with the status filter", () => {
    expect(filterInvoices(invoices, clients, "", "all", TODAY, { dueFrom: "", dueTo: "" }).map((i) => i.id)).toEqual(["1", "2"]);
    expect(filterInvoices(invoices, clients, "", "paid", TODAY, { dueFrom: "2026-11-01" }).map((i) => i.id)).toEqual(["2"]);
    expect(filterInvoices(invoices, clients, "", "unpaid", TODAY, { dueFrom: "2026-11-01" })).toEqual([]);
  });
});

describe("filterClients", () => {
  it("matches name, email, and company case-insensitively", () => {
    expect(filterClients(clients, "SARA").map((c) => c.id)).toEqual(["c1"]);
    expect(filterClients(clients, "a@example.com").map((c) => c.id)).toEqual(["c1"]);
    expect(filterClients(clients, "").length).toBe(2);
    expect(filterClients(clients, "zzz").length).toBe(0);
  });
});

describe("sortInvoicesRecent", () => {
  it("orders by issued date descending", () => {
    const sorted = sortInvoicesRecent([
      inv({ id: "old", issuedDate: "2026-10-01" }),
      inv({ id: "new", issuedDate: "2026-10-20" }),
    ]);
    expect(sorted.map((i) => i.id)).toEqual(["new", "old"]);
  });
});

describe("seedData", () => {
  it("seeds 3 clients and 5 invoices including one overdue unpaid invoice", () => {
    const seed = seedData(TODAY);
    expect(seed.clients.length).toBe(3);
    expect(seed.invoices.length).toBe(5);
    expect(seed.invoices.some((i) => isOverdue(i, TODAY))).toBe(true);
    expect(seed.invoices.some((i) => i.status === "paid")).toBe(true);
  });
});
