import { computeInvoiceTotal, computeRemainingBalance } from "./invoices";
import type { Invoice, Payment } from "./types";

/** "2026-11" for a YYYY-MM-DD date. */
export function monthKey(date: string): string {
  return date.slice(0, 7);
}

/** The month before "2026-11" is "2026-10"; before "2026-01" is "2025-12". */
export function previousMonthKey(key: string): string {
  const [year, month] = key.split("-").map(Number);
  const previous = new Date(year, month - 2, 1);
  return `${previous.getFullYear()}-${String(previous.getMonth() + 1).padStart(2, "0")}`;
}

/** Total paid per month, from real payment rows grouped by their paidAt month. */
export function sumPaidByMonth(payments: Payment[]): Map<string, number> {
  const totals = new Map<string, number>();
  for (const payment of payments) {
    const key = monthKey(payment.paidAt);
    totals.set(key, (totals.get(key) ?? 0) + payment.amount);
  }
  return totals;
}

/** Total billed per month, from invoice totals grouped by their issued month. */
export function sumBilledByMonth(invoices: Invoice[]): Map<string, number> {
  const totals = new Map<string, number>();
  for (const invoice of invoices) {
    const key = monthKey(invoice.issuedDate);
    totals.set(key, (totals.get(key) ?? 0) + computeInvoiceTotal(invoice));
  }
  return totals;
}

export type DeltaDirection = "down" | "flat" | "new" | "none" | "up";

export interface Delta {
  direction: DeltaDirection;
  label: string;
  percent: number | null;
}

/**
 * Change from last month to this month, in plain words. The percent is
 * rounded to a whole number; when last month was zero there is no
 * percent to show, so the label says so instead of inventing one.
 */
export function deltaVsPrevious(current: number, previous: number): Delta {
  if (previous === 0) {
    if (current === 0) return { direction: "none", label: "Nothing yet", percent: null };
    return { direction: "new", label: "New this month", percent: null };
  }
  const percent = Math.round(((current - previous) / previous) * 100);
  if (percent === 0) return { direction: "flat", label: "Same as last month", percent: 0 };
  if (percent > 0) return { direction: "up", label: `${percent}% vs last month`, percent };
  return { direction: "down", label: `${Math.abs(percent)}% vs last month`, percent };
}

export interface PeriodTotals {
  billed: number;
  outstanding: number;
  paid: number;
}

/**
 * Totals for invoices issued inside [start, end] (YYYY-MM-DD, inclusive).
 * Billed is those invoices' totals. Paid is payments dated inside the
 * period. Outstanding is what those invoices still owe right now —
 * their totals minus all their payments, whenever those landed — so
 * the three figures always reconcile: billed = paid + outstanding
 * only when every payment also landed inside the period.
 */
export function periodTotals(
  invoices: Invoice[],
  payments: Payment[],
  start: string,
  end: string,
): PeriodTotals {
  const inPeriod = invoices.filter((inv) => inv.issuedDate >= start && inv.issuedDate <= end);
  let billed = 0;
  let outstanding = 0;
  for (const inv of inPeriod) {
    billed += computeInvoiceTotal(inv);
    outstanding += computeRemainingBalance(
      inv,
      payments.filter((p) => p.invoiceId === inv.id),
    );
  }
  let paid = 0;
  for (const payment of payments) {
    if (payment.paidAt >= start && payment.paidAt <= end) paid += payment.amount;
  }
  return {
    billed: Math.round(billed * 100) / 100,
    outstanding: Math.round(outstanding * 100) / 100,
    paid: Math.round(paid * 100) / 100,
  };
}

export interface Quarter {
  end: string;
  key: string;
  start: string;
}
/** The calendar quarter containing `today`, with its first and last dates. */
export function currentQuarter(today: string): Quarter {
  const year = Number(today.slice(0, 4));
  const month = Number(today.slice(5, 7));
  const firstMonth = Math.floor((month - 1) / 3) * 3 + 1;
  const lastDay = new Date(year, firstMonth + 2, 0);
  const quarter = Math.floor((month - 1) / 3) + 1;
  return {
    end: `${year}-${String(firstMonth + 2).padStart(2, "0")}-${String(lastDay.getDate()).padStart(2, "0")}`,
    key: `${year}-Q${quarter}`,
    start: `${year}-${String(firstMonth).padStart(2, "0")}-01`,
  };
}

export interface MonthRow {
  billed: number;
  key: string;
  label: string;
  outstanding: number;
  paid: number;
}

/**
 * Last 6 calendar months ending at `today`'s month. Billed counts
 * invoices issued that month, paid counts payments dated that month,
 * and outstanding is what that month's invoices still owe right now.
 * A payment dated in a later month therefore lifts that month's paid
 * figure while still reducing the original month's outstanding.
 */
export function monthlyTable(
  invoices: Invoice[],
  payments: Payment[],
  today: string,
): MonthRow[] {
  const billed = sumBilledByMonth(invoices);
  const paid = sumPaidByMonth(payments);
  const keys: string[] = [];
  let key = monthKey(today);
  for (let i = 0; i < 6; i++) {
    keys.unshift(key);
    key = previousMonthKey(key);
  }
  return keys.map((k) => {
    const [year, month] = k.split("-").map(Number);
    const label = new Date(year, month - 1, 1).toLocaleString("en-US", {
      month: "short",
      year: "numeric",
    });
    let outstanding = 0;
    for (const invoice of invoices) {
      if (monthKey(invoice.issuedDate) !== k) continue;
      outstanding += computeRemainingBalance(
        invoice,
        payments.filter((p) => p.invoiceId === invoice.id),
      );
    }
    const round = (n: number) => Math.round(n * 100) / 100;
    return {
      billed: round(billed.get(k) ?? 0),
      key: k,
      label,
      outstanding: round(outstanding),
      paid: round(paid.get(k) ?? 0),
    };
  });
}
