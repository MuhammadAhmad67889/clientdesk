import { computeRemainingBalance, formatInvoiceNumber } from "./invoices";
import type { Client, Invoice, Payment } from "./types";

export interface PaymentRow {
  amount: number;
  clientName: string;
  /** Paid date for recorded payments, due date for pending balances. */
  date: string;
  description: string;
  invoiceId: string;
  invoiceNumber: string;
  kind: "payment" | "pending";
  method?: string;
  reference?: string;
}

/**
 * Every row the Payments page shows, from real rows only. Recorded
 * payments become "payment" rows; invoices that still owe money
 * become "pending" rows for their remaining balance. There is no
 * "scheduled" or "refunded" row here, because the app has neither
 * scheduled payments nor refunds — inventing those tabs would fake
 * a feature that does not exist.
 */
export function buildPaymentRows(
  payments: Payment[],
  invoices: Invoice[],
  clients: Client[],
): PaymentRow[] {
  const invoiceById = new Map(invoices.map((inv) => [inv.id, inv]));
  const clientById = new Map(clients.map((c) => [c.id, c]));
  const rows: PaymentRow[] = [];

  for (const payment of payments) {
    const invoice = invoiceById.get(payment.invoiceId);
    rows.push({
      amount: payment.amount,
      clientName: invoice ? (clientById.get(invoice.clientId)?.name ?? "Unknown client") : "Unknown client",
      date: payment.paidAt,
      description: invoice?.description ?? "Payment",
      invoiceId: payment.invoiceId,
      invoiceNumber: invoice ? formatInvoiceNumber(invoice.number) : "—",
      kind: "payment",
      method: payment.method,
      reference: payment.reference,
    });
  }

  for (const invoice of invoices) {
    const balance = computeRemainingBalance(
      invoice,
      payments.filter((p) => p.invoiceId === invoice.id),
    );
    if (balance <= 0) continue;
    rows.push({
      amount: balance,
      clientName: clientById.get(invoice.clientId)?.name ?? "Unknown client",
      date: invoice.dueDate,
      description: invoice.description,
      invoiceId: invoice.id,
      invoiceNumber: formatInvoiceNumber(invoice.number),
      kind: "pending",
    });
  }

  // Newest first; recorded payments sort before pending balances on
  // the same date, so the list reads like a ledger.
  rows.sort((a, b) => {
    if (a.date !== b.date) return b.date.localeCompare(a.date);
    if (a.kind !== b.kind) return a.kind === "payment" ? -1 : 1;
    return 0;
  });
  return rows;
}

/** What the Payments page header totals: received so far, still owed. */
export function summarizePaymentRows(rows: PaymentRow[]): { pending: number; received: number } {
  let received = 0;
  let pending = 0;
  for (const row of rows) {
    if (row.kind === "payment") received += row.amount;
    else pending += row.amount;
  }
  return {
    pending: Math.round(pending * 100) / 100,
    received: Math.round(received * 100) / 100,
  };
}

/** The invoice total a payment form defaults to: what is still owed. */
export function remainingByInvoice(
  invoices: Invoice[],
  payments: Payment[],
): Map<string, number> {
  const remaining = new Map<string, number>();
  for (const invoice of invoices) {
    remaining.set(
      invoice.id,
      computeRemainingBalance(
        invoice,
        payments.filter((p) => p.invoiceId === invoice.id),
      ),
    );
  }
  return remaining;
}
