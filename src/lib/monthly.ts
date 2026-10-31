import type { Invoice } from "./types";
import { roundMoney } from "./invoices";

export interface MonthTotal {
  key: string;
  label: string;
  outstanding: number;
  paid: number;
}

/**
 * Last 6 calendar months (including the month of `now`), from real
 * invoice issued dates. Months with no invoices still appear, with
 * zero totals, so the dashboard never implies a missing month.
 */
export function computeMonthlyOverview(
  invoices: Invoice[],
  now = new Date(),
): MonthTotal[] {
  const list: MonthTotal[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    list.push({
      key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`,
      label: d.toLocaleString("en-US", { month: "short", year: "numeric" }),
      outstanding: 0,
      paid: 0,
    });
  }
  const byKey = new Map(list.map((m) => [m.key, m]));
  for (const inv of invoices) {
    const month = byKey.get(inv.issuedDate.slice(0, 7));
    if (!month) continue;
    if (inv.status === "paid") month.paid += inv.amount;
    else month.outstanding += inv.amount;
  }
  for (const month of list) {
    month.paid = roundMoney(month.paid);
    month.outstanding = roundMoney(month.outstanding);
  }
  return list;
}
