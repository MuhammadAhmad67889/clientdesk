import { describe, expect, it } from "vitest";
import {
  collectionRate,
  currentQuarter,
  deltaVsPrevious,
  monthKey,
  monthlyTable,
  periodTotals,
  previousMonthKey,
  statusBreakdown,
  sumBilledByMonth,
  sumPaidByMonth,
  topClients,
} from "./analytics";
import type { Invoice, Payment } from "./types";

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
    amount: 100,
    invoiceId: "i1",
    paidAt: "2026-11-06",
    userId: "u1",
    ...partial,
  };
}

describe("month helpers", () => {
  it("takes the month from a date and steps back across the year boundary", () => {
    expect(monthKey("2026-11-04")).toBe("2026-11");
    expect(previousMonthKey("2026-11")).toBe("2026-10");
    expect(previousMonthKey("2026-01")).toBe("2025-12");
  });

  it("sums paid and billed amounts by month", () => {
    expect(
      sumPaidByMonth([
        payment({ amount: 50, id: "p1", paidAt: "2026-10-02" }),
        payment({ amount: 25, id: "p2", paidAt: "2026-10-20" }),
        payment({ amount: 100, id: "p3", paidAt: "2026-11-01" }),
      ]),
    ).toEqual(
      new Map([
        ["2026-10", 75],
        ["2026-11", 100],
      ]),
    );
    expect(
      sumBilledByMonth([
        invoice({ amount: 200, id: "i1", issuedDate: "2026-11-03" }),
        invoice({ amount: 300, discountRate: 10, id: "i2", issuedDate: "2026-11-10", taxRate: 10 }),
      ]),
    ).toEqual(new Map([["2026-11", 497]]));
  });
});

describe("deltaVsPrevious", () => {
  it("reports up, down, flat, new, and empty months honestly", () => {
    expect(deltaVsPrevious(110, 100)).toEqual({ direction: "up", label: "10% vs last month", percent: 10 });
    expect(deltaVsPrevious(90, 100)).toEqual({ direction: "down", label: "10% vs last month", percent: -10 });
    expect(deltaVsPrevious(100, 100)).toEqual({ direction: "flat", label: "Same as last month", percent: 0 });
    expect(deltaVsPrevious(50, 0)).toEqual({ direction: "new", label: "New this month", percent: null });
    expect(deltaVsPrevious(0, 0)).toEqual({ direction: "none", label: "Nothing yet", percent: null });
  });
});

describe("periodTotals", () => {
  it("bills by issued month, pays by paid month, and owes current balances", () => {
    const invoices = [
      invoice({ amount: 200, id: "i1", issuedDate: "2026-11-03" }),
      invoice({ amount: 100, id: "i2", issuedDate: "2026-10-15" }),
    ];
    const payments = [
      payment({ amount: 50, id: "p1", invoiceId: "i1", paidAt: "2026-11-06" }),
      // A payment for a November invoice that landed in December still
      // reduces what that invoice owes, but it is not November paid.
      payment({ amount: 100, id: "p2", invoiceId: "i1", paidAt: "2026-12-02" }),
    ];
    expect(periodTotals(invoices, payments, "2026-11-01", "2026-11-30")).toEqual({
      billed: 200,
      outstanding: 50,
      paid: 50,
    });
  });
});

describe("currentQuarter", () => {
  it("finds the quarter and its dates", () => {
    expect(currentQuarter("2026-11-04")).toEqual({ end: "2026-12-31", key: "2026-Q4", start: "2026-10-01" });
    expect(currentQuarter("2026-02-10")).toEqual({ end: "2026-03-31", key: "2026-Q1", start: "2026-01-01" });
  });
});

describe("monthlyTable", () => {
  it("bills by issued month, pays by paid month, owes current balances", () => {
    const rows = monthlyTable(
      [
        invoice({ amount: 200, id: "i1", issuedDate: "2026-11-03" }),
        invoice({ amount: 100, id: "i2", issuedDate: "2026-10-15" }),
      ],
      [
        payment({ amount: 50, id: "p1", invoiceId: "i1", paidAt: "2026-11-06" }),
        payment({ amount: 100, id: "p2", invoiceId: "i1", paidAt: "2026-12-02" }),
      ],
      "2026-11-04",
    );
    const november = rows.find((r) => r.key === "2026-11")!;
    const october = rows.find((r) => r.key === "2026-10")!;
    // November billed 200; November paid 50 (the December payment is
    // not November paid); November outstanding 50 (200 − 50 − 100).
    expect(november).toEqual({ billed: 200, key: "2026-11", label: "Nov 2026", outstanding: 50, paid: 50 });
    expect(october).toEqual({ billed: 100, key: "2026-10", label: "Oct 2026", outstanding: 100, paid: 0 });
    expect(rows).toHaveLength(6);
  });
});

describe("statusBreakdown", () => {
  it("puts each invoice in exactly one bucket, overdue before partial", () => {
    const rows = statusBreakdown(
      [
        invoice({ amount: 100, dueDate: "2026-11-30", id: "i1" }),
        invoice({ amount: 200, dueDate: "2026-10-01", id: "i2" }),
        invoice({ amount: 300, dueDate: "2026-10-01", id: "i3" }),
        invoice({ amount: 400, dueDate: "2026-11-30", id: "i4" }),
      ],
      [
        payment({ amount: 100, id: "p1", invoiceId: "i1" }),
        payment({ amount: 50, id: "p2", invoiceId: "i3" }),
        payment({ amount: 100, id: "p3", invoiceId: "i4" }),
      ],
      "2026-11-04",
    );
    const byKey = new Map(rows.map((r) => [r.key, r]));
    // i1 fully paid; i2 unpaid and past due; i3 partly paid and past
    // due, so overdue wins; i4 partly paid, due date still ahead.
    expect(byKey.get("paid")).toEqual({ amount: 100, count: 1, key: "paid" });
    expect(byKey.get("overdue")).toEqual({ amount: 500, count: 2, key: "overdue" });
    expect(byKey.get("partial")).toEqual({ amount: 400, count: 1, key: "partial" });
    expect(byKey.get("unpaid")).toEqual({ amount: 0, count: 0, key: "unpaid" });
  });
});

describe("topClients", () => {
  it("ranks by billed and adds up paid and outstanding per client", () => {
    const rows = topClients(
      [
        invoice({ amount: 100, clientId: "c1", id: "i1" }),
        invoice({ amount: 500, clientId: "c2", id: "i2" }),
        invoice({ amount: 200, clientId: "c1", id: "i3" }),
      ],
      [payment({ amount: 100, id: "p1", invoiceId: "i1" })],
      [
        { archived: false, createdAt: "2026-11-01", id: "c1", name: "Sara" },
        { archived: false, createdAt: "2026-11-01", id: "c2", name: "Omar" },
      ],
      5,
    );
    expect(rows).toEqual([
      { billed: 500, id: "c2", name: "Omar", outstanding: 500, paid: 0 },
      { billed: 300, id: "c1", name: "Sara", outstanding: 200, paid: 100 },
    ]);
  });
});

describe("collectionRate", () => {
  it("returns null with no billed invoices instead of a misleading 0%", () => {
    expect(collectionRate([], [])).toBeNull();
    expect(
      collectionRate(
        [invoice({ amount: 200, id: "i1" })],
        [payment({ amount: 50, id: "p1", invoiceId: "i1" })],
      ),
    ).toBe(25);
  });
});

describe("monthlyTable range", () => {
  it("returns 12 rows when asked, still ending at this month", () => {
    const rows = monthlyTable([], [], "2026-11-04", 12);
    expect(rows).toHaveLength(12);
    expect(rows[11].key).toBe("2026-11");
    expect(rows[0].key).toBe("2025-12");
  });
});
