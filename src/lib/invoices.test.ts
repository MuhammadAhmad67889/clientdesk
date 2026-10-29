import { describe, expect, it } from "vitest";
import {
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
    dueDate: "2026-11-01",
    issuedDate: "2026-10-20",
    status: "unpaid",
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
