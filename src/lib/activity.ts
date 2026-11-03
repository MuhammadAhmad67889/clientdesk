import { computeInvoiceTotal, formatInvoiceNumber, formatMoney } from "./invoices";
import type { Client, Invoice, Payment } from "./types";

/** Recent activity, derived from rows that already exist — no
 * activity table, nothing invented. A client added, an invoice
 * issued, a payment recorded, newest first. */
export interface ActivityItem {
  date: string; // YYYY-MM-DD
  text: string;
}

export function buildActivity(
  clients: Client[],
  invoices: Invoice[],
  payments: Payment[],
  limit = 8,
): ActivityItem[] {
  const byClient = new Map(clients.map((c) => [c.id, c.name]));
  const byInvoice = new Map(invoices.map((inv) => [inv.id, inv]));
  // Rank breaks same-day ties so the most concrete event — money
  // in — reads first: payment, then invoice, then client.
  const rank = { client: 0, invoice: 1, payment: 2 };
  const items: (ActivityItem & { rank: number })[] = [
    ...clients.map((c) => ({
      date: c.createdAt,
      rank: rank.client,
      text: `Client ${c.name} added`,
    })),
    ...invoices.map((inv) => ({
      date: inv.issuedDate,
      rank: rank.invoice,
      text: `Invoice ${formatInvoiceNumber(inv.number)} created for ${byClient.get(inv.clientId) ?? "a client"} — ${formatMoney(computeInvoiceTotal(inv))}`,
    })),
    ...payments.map((p) => {
      const inv = byInvoice.get(p.invoiceId);
      const label = inv ? `invoice ${formatInvoiceNumber(inv.number)}` : "an invoice";
      return {
        date: p.paidAt,
        rank: rank.payment,
        text: `Payment ${formatMoney(p.amount)} recorded for ${label}`,
      };
    }),
  ];
  items.sort((a, b) => b.date.localeCompare(a.date) || b.rank - a.rank);
  return items.slice(0, limit).map(({ date, text }) => ({ date, text }));
}
