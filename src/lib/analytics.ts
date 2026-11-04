import { computeAmountPaid, computeInvoiceTotal, computeRemainingBalance } from "./invoices";
import type { Client, Invoice, Payment } from "./types";

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
 * Last `count` calendar months ending at `today`'s month. Billed counts
 * invoices issued that month, paid counts payments dated that month,
 * and outstanding is what that month's invoices still owe right now.
 * A payment dated in a later month therefore lifts that month's paid
 * figure while still reducing the original month's outstanding.
 */
export function monthlyTable(
  invoices: Invoice[],
  payments: Payment[],
  today: string,
  count = 6,
): MonthRow[] {
  const billed = sumBilledByMonth(invoices);
  const paid = sumPaidByMonth(payments);
  const keys: string[] = [];
  let key = monthKey(today);
  for (let i = 0; i < count; i++) {
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

export type StatusBucket = "overdue" | "paid" | "partial" | "unpaid";

export interface StatusSlice {
  amount: number;
  count: number;
  key: StatusBucket;
}

/**
 * Where the money stands, one bucket per invoice. The amount is the
 * invoice total, so the four slices always add up to total billed.
 * Overdue wins over partial: an invoice with some money in and a
 * missed due date is overdue, not partial. Balances, not the status
 * flag, decide — a payment can land without the flag catching up.
 */
export function statusBreakdown(
  invoices: Invoice[],
  payments: Payment[],
  today: string,
): StatusSlice[] {
  const totals: Record<StatusBucket, { amount: number; count: number }> = {
    overdue: { amount: 0, count: 0 },
    paid: { amount: 0, count: 0 },
    partial: { amount: 0, count: 0 },
    unpaid: { amount: 0, count: 0 },
  };
  for (const invoice of invoices) {
    const own = payments.filter((p) => p.invoiceId === invoice.id);
    const remaining = computeRemainingBalance(invoice, own);
    const total = computeInvoiceTotal(invoice);
    let key: StatusBucket;
    if (remaining === 0) key = "paid";
    else if (invoice.dueDate < today) key = "overdue";
    else if (computeAmountPaid(own) > 0) key = "partial";
    else key = "unpaid";
    totals[key].amount = Math.round((totals[key].amount + total) * 100) / 100;
    totals[key].count += 1;
  }
  return (Object.keys(totals) as StatusBucket[]).map((key) => ({
    amount: totals[key].amount,
    count: totals[key].count,
    key,
  }));
}

export interface ClientRow {
  billed: number;
  id: string;
  name: string;
  outstanding: number;
  paid: number;
}

/** Clients ranked by billed total, highest first. Archived clients stay in. */
export function topClients(
  invoices: Invoice[],
  payments: Payment[],
  clients: Client[],
  limit = 5,
): ClientRow[] {
  const byId = new Map(clients.map((c) => [c.id, c.name]));
  const rows = new Map<string, ClientRow>();
  for (const invoice of invoices) {
    const own = payments.filter((p) => p.invoiceId === invoice.id);
    const row = rows.get(invoice.clientId) ?? {
      billed: 0,
      id: invoice.clientId,
      name: byId.get(invoice.clientId) ?? "Unknown client",
      outstanding: 0,
      paid: 0,
    };
    row.billed = Math.round((row.billed + computeInvoiceTotal(invoice)) * 100) / 100;
    row.paid = Math.round((row.paid + computeAmountPaid(own)) * 100) / 100;
    row.outstanding = Math.round((row.outstanding + computeRemainingBalance(invoice, own)) * 100) / 100;
    rows.set(invoice.clientId, row);
  }
  return [...rows.values()].sort((a, b) => b.billed - a.billed).slice(0, limit);
}

/**
 * Share of billed money that has actually arrived, as a whole percent.
 * Null when nothing has been billed yet — there is no rate to show,
 * and 0% would wrongly imply money is missing.
 */
export function collectionRate(invoices: Invoice[], payments: Payment[]): number | null {
  let billed = 0;
  let paid = 0;
  for (const invoice of invoices) billed += computeInvoiceTotal(invoice);
  for (const payment of payments) paid += payment.amount;
  if (billed === 0) return null;
  return Math.round((paid / billed) * 100);
}
