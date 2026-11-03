/** Rule-based draft helpers. These are not AI: every value below comes
 * from a stated rule over data the user already has, and every result
 * is a draft the user reviews before it becomes a record. Nothing here
 * invents a figure, a client, or a date — when a rule finds nothing, the
 * field stays empty for the user to fill in.
 *
 * Invoice draft parser rules:
 * - Amount: the largest figure marked with $, USD, Rs, or PKR. If none
 *   is marked, the first bare number on a line that says total, amount,
 *   due, or payable.
 * - Due date: a YYYY-MM-DD date first, else DD/MM/YYYY converted to
 *   YYYY-MM-DD. Invalid calendar dates (for example 2026-02-30) are
 *   rejected, not silently rolled over.
 * - Client: the longest existing client name that appears in the text.
 * - Description: the first non-empty line, trimmed to 120 characters.
 */
import {
  computeAmountPaid,
  computeInvoiceTotal,
  computeRemainingBalance,
  isOverdue,
  outstandingByClient,
  roundMoney,
} from "./invoices";
import type { Client, Invoice, Payment } from "./types";

export interface InvoiceDraft {
  amount: number | null;
  clientId: string | null;
  clientName: string | null;
  description: string;
  dueDate: string | null;
}

function isValidDate(year: number, month: number, day: number): boolean {
  if (month < 1 || month > 12 || day < 1 || day > 31) return false;
  const d = new Date(Date.UTC(year, month - 1, day));
  return d.getUTCFullYear() === year && d.getUTCMonth() === month - 1 && d.getUTCDate() === day;
}

// One amount, written two ways: grouped thousands ("1,200.00") or a
// plain number ("1200" or "1200.50"). The grouped form must actually
// contain a comma group, otherwise "1200" would match as just "120".
const AMOUNT_PATTERN = String.raw`\d{1,3}(?:,\d{3})+(?:\.\d{1,2})?|\d+(?:\.\d{1,2})?`;

function parseMarkedAmounts(text: string): number[] {
  const amounts: number[] = [];
  const re = new RegExp(String.raw`(?:\$|USD|Rs\.?|PKR)\s*(${AMOUNT_PATTERN})`, "gi");
  for (const m of text.matchAll(re)) amounts.push(Number(m[1].replace(/,/g, "")));
  return amounts;
}

function parseBareTotal(text: string): number | null {
  for (const line of text.split(/\r?\n/)) {
    if (!/(total|amount|due|payable)/i.test(line)) continue;
    // Dates are not amounts: strip them before looking for a number.
    const withoutDates = line.replace(/\d{4}-\d{2}-\d{2}/g, "").replace(/\d{1,2}\/\d{1,2}\/\d{4}/g, "");
    const m = withoutDates.match(new RegExp(`(${AMOUNT_PATTERN})`));
    if (m) return Number(m[1].replace(/,/g, ""));
  }
  return null;
}

function parseDueDate(text: string): string | null {
  const iso = text.match(/(\d{4})-(\d{2})-(\d{2})/);
  if (iso) {
    const [, y, mo, d] = iso.map(Number);
    if (isValidDate(y, mo, d)) return iso[0];
  }
  const dmy = text.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (dmy) {
    const [, d, mo, y] = dmy.map(Number);
    if (isValidDate(y, mo, d)) {
      return `${y}-${String(mo).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    }
  }
  return null;
}

export function parseInvoiceDraft(text: string, clients: Client[]): InvoiceDraft {
  const marked = parseMarkedAmounts(text);
  const amount = marked.length > 0 ? Math.max(...marked) : parseBareTotal(text);
  const client = findClientInText(text, clients);
  const firstLine = text.split(/\r?\n/).find((line) => line.trim().length > 0)?.trim() ?? "";
  return {
    amount: amount === null || Number.isNaN(amount) ? null : roundMoney(amount),
    clientId: client?.id ?? null,
    clientName: client?.name ?? null,
    description: firstLine.slice(0, 120),
    dueDate: parseDueDate(text),
  };
}

/** The longest client name found in the text. Longest wins so that
 * "Acme Studio" beats "Acme" when both appear; on a tie, the first
 * client in the list wins. */
function findClientInText(text: string, clients: Client[]): Client | null {
  const lowered = text.toLowerCase();
  let match: Client | null = null;
  for (const c of clients) {
    if (lowered.includes(c.name.toLowerCase()) && (!match || c.name.length > match.name.length)) match = c;
  }
  return match;
}

/** A reminder email draft for one invoice. The numbers come from the
 * invoice and its recorded payments; the wording is a fixed template. */
export function buildReminderDraft(input: {
  balance: number;
  clientName: string;
  dueDate: string;
  invoiceNumber: string;
  paid: number;
  today: string;
  total: number;
}): { body: string; subject: string } {
  const MS_PER_DAY = 86_400_000;
  const overdueDays = Math.floor(
    (Date.parse(`${input.today}T00:00:00Z`) - Date.parse(`${input.dueDate}T00:00:00Z`)) / MS_PER_DAY,
  );
  const subject = `Reminder: invoice ${input.invoiceNumber} — $${input.balance.toFixed(2)} outstanding`;
  const timing =
    overdueDays > 0
      ? `It is ${overdueDays} day${overdueDays === 1 ? "" : "s"} past its due date of ${input.dueDate}.`
      : `It is due on ${input.dueDate}.`;
  return {
    body: [
      `Hi ${input.clientName},`,
      ``,
      `A quick reminder about invoice ${input.invoiceNumber}: $${input.total.toFixed(2)} total, $${input.paid.toFixed(2)} paid, $${input.balance.toFixed(2)} still outstanding. ${timing}`,
      ``,
      `If you have already paid, please ignore this note. Otherwise, could you let me know when payment will go out?`,
      ``,
      `Thanks,`,
    ].join("\n"),
    subject,
  };
}

export interface MonthSummary {
  billed: number;
  count: number;
  outstanding: number;
  overdueCount: number;
  paid: number;
}

/** Plain arithmetic over one month's invoices and payments — no
 * forecasting, no scoring. Outstanding counts only invoices issued
 * that month; paid counts payments dated that month. */
export function summarizeMonth(
  invoices: Invoice[],
  payments: Payment[],
  month: string,
  today: string,
): MonthSummary {
  const monthInvoices = invoices.filter((inv) => inv.issuedDate.startsWith(month));
  const byInvoice = new Map<string, Payment[]>();
  for (const p of payments) {
    const list = byInvoice.get(p.invoiceId) ?? [];
    list.push(p);
    byInvoice.set(p.invoiceId, list);
  }
  let billed = 0;
  let outstanding = 0;
  let overdueCount = 0;
  for (const inv of monthInvoices) {
    const mine = byInvoice.get(inv.id) ?? [];
    billed += computeInvoiceTotal(inv);
    const balance = computeRemainingBalance(inv, mine);
    outstanding += balance;
    if (balance > 0 && isOverdue(inv, today)) overdueCount += 1;
  }
  const paid = payments.filter((p) => p.paidAt.startsWith(month)).reduce((sum, p) => sum + p.amount, 0);
  return {
    billed: roundMoney(billed),
    count: monthInvoices.length,
    outstanding: roundMoney(outstanding),
    overdueCount,
    paid: roundMoney(paid),
  };
}

/** Clients ordered by outstanding balance, largest first. This is a
 * sort, not a risk prediction — the dashboard labels it as such. */
export function rankClientsByOutstanding(
  clients: Client[],
  invoices: Invoice[],
  payments: Payment[],
  limit = 5,
): { client: Client; outstanding: number }[] {
  const outstanding = outstandingByClient(invoices, payments);
  return clients
    .map((client) => ({ client, outstanding: outstanding[client.id] ?? 0 }))
    .filter((row) => row.outstanding > 0)
    .sort((a, b) => b.outstanding - a.outstanding)
    .slice(0, limit);
}

export function totalPaidFor(invoiceId: string, payments: Payment[]): number {
  return computeAmountPaid(payments.filter((p) => p.invoiceId === invoiceId));
}
