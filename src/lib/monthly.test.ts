import { describe, expect, it } from "vitest";
import { computeMonthlyOverview } from "./monthly";
import type { Invoice } from "./types";

function invoice(issuedDate: string, amount: number, status: "paid" | "unpaid"): Invoice {
  return { amount, clientId: "c1", description: "Test", dueDate: "2026-11-20", id: `inv-${issuedDate}-${status}`, issuedDate, status };
}

describe("computeMonthlyOverview", () => {
  it("returns the last 6 months ending in the current month, in order", () => {
    const months = computeMonthlyOverview([], new Date(2026, 9, 31));
    expect(months.map((m) => m.key)).toEqual([
      "2026-05", "2026-06", "2026-07", "2026-08", "2026-09", "2026-10",
    ]);
    expect(months.map((m) => m.label)).toEqual([
      "May 2026", "Jun 2026", "Jul 2026", "Aug 2026", "Sep 2026", "Oct 2026",
    ]);
    expect(months.every((m) => m.paid === 0 && m.outstanding === 0)).toBe(true);
  });
  it("sums paid and outstanding by issued month and ignores older invoices", () => {
    const months = computeMonthlyOverview(
      [
        invoice("2026-10-05", 100, "paid"),
        invoice("2026-10-06", 50.555, "unpaid"),
        invoice("2026-09-01", 200, "paid"),
        invoice("2025-01-01", 999, "paid"),
      ],
      new Date(2026, 9, 31),
    );
    const oct = months.find((m) => m.key === "2026-10")!;
    const sep = months.find((m) => m.key === "2026-09")!;
    expect(oct.paid).toBe(100);
    expect(oct.outstanding).toBe(50.56);
    expect(sep.paid).toBe(200);
    expect(months.reduce((sum, m) => sum + m.paid, 0)).toBe(300);
  });
});
