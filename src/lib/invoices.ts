import type { Client, Invoice, InvoiceFilter, Payment, Totals } from "./types";

/** Today as YYYY-MM-DD, in local time. Pure callers pass `today` explicitly. */
export function todayIso(date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function addDays(iso: string, days: number): string {
  const d = new Date(`${iso}T12:00:00`);
  d.setDate(d.getDate() + days);
  return todayIso(d);
}

export function isOverdue(invoice: Invoice, today: string): boolean {
  return invoice.status === "unpaid" && invoice.dueDate < today;
}

/**
 * Total due for one amount: discount first, then tax on the discounted
 * amount, rounded to cents. The invoice version below is just this
 * with the invoice's own figures, so the landing-page calculator and
 * every real invoice share one piece of math.
 */
export function totalForAmount(amount: number, discountRate: number, taxRate: number): number {
  const discounted = amount * (1 - discountRate / 100);
  return roundMoney(discounted * (1 + taxRate / 100));
}

export function computeInvoiceTotal(invoice: Invoice): number {
  return totalForAmount(invoice.amount, invoice.discountRate, invoice.taxRate);
}

export function computeAmountPaid(payments: Payment[]): number {
  return roundMoney(payments.reduce((sum, p) => sum + p.amount, 0));
}

/** What is still owed: total due minus recorded payments, never below zero. */
export function computeRemainingBalance(invoice: Invoice, payments: Payment[]): number {
  return Math.max(0, roundMoney(computeInvoiceTotal(invoice) - computeAmountPaid(payments)));
}

export interface InvoiceEdit {
  amount: number;
  description: string;
  discountRate: number;
  dueDate: string;
  items?: InvoiceItemInput[];
  taxRate: number;
}

/** A line item as a form or API sends it — no id yet. */
export interface InvoiceItemInput {
  description: string;
  quantity: number;
  unitPrice: number;
}

/** Base amount from line items: quantity × unit price, summed and
 * rounded to cents. Used as the invoice amount when items exist. */
export function computeItemsSubtotal(items: InvoiceItemInput[]): number {
  return roundMoney(items.reduce((sum, it) => sum + it.quantity * it.unitPrice, 0));
}

/** One plain error for the whole items list, or null when valid. */
export function validateInvoiceItems(items: InvoiceItemInput[]): string | null {
  if (items.length === 0) return "Add at least one line item.";
  if (items.length > 50) return "At most 50 line items per invoice.";
  for (const it of items) {
    if (!it.description.trim()) return "Every line item needs a description.";
    if (!(it.quantity > 0)) return "Every line item quantity must be more than 0.";
    if (!(it.unitPrice >= 0)) return "Every line item price must be 0 or more.";
  }
  return null;
}

/** Parse line items from a request body. Null when malformed —
 * the route answers 400. Quantities and prices are rounded to cents,
 * because the money math downstream is in cents. */
export function parseInvoiceItems(value: unknown): InvoiceItemInput[] | null {
  if (!Array.isArray(value)) return null;
  const items: InvoiceItemInput[] = [];
  for (const row of value) {
    if (!row || typeof row !== "object") return null;
    const r = row as Record<string, unknown>;
    if (typeof r.description !== "string") return null;
    const quantity = Number(r.quantity);
    const unitPrice = Number(r.unitPrice);
    if (!Number.isFinite(quantity) || !Number.isFinite(unitPrice)) return null;
    items.push({
      description: r.description.trim(),
      quantity: Math.round(quantity * 100) / 100,
      unitPrice: Math.round(unitPrice * 100) / 100,
    });
  }
  return items;
}

/**
 * Apply an edit to an invoice in memory. The number, client, issued
 * date and payments never change here. Status only ever moves toward
 * paid: when recorded payments already cover the new total, the
 * invoice becomes paid; a manually-marked-paid invoice is left alone.
 */
export function applyInvoiceEdit(invoice: Invoice, payments: Payment[], edit: InvoiceEdit): Invoice {
  // With line items, the amount is their subtotal — the stored
  // amount field keeps working as the base for discount and tax.
  // Item rows themselves are replaced by the data layer; this
  // function only computes the amount and the status.
  const { items, ...rest } = edit;
  const amount = items ? computeItemsSubtotal(items) : edit.amount;
  const updated: Invoice = { ...invoice, ...rest, amount };
  if (computeAmountPaid(payments) >= computeInvoiceTotal(updated) - 0.001) {
    updated.status = "paid";
  }
  return updated;
}

/**
 * Status after deleting a payment: a paid invoice drops back to
 * unpaid when the remaining payments no longer cover its total.
 * Anything else keeps its status — in particular, deleting a payment
 * from an unpaid invoice changes nothing about its status.
 */
export function applyPaymentDeletion(invoice: Invoice, remainingPayments: Payment[]): Invoice {
  if (invoice.status === "paid" && computeAmountPaid(remainingPayments) < computeInvoiceTotal(invoice) - 0.001) {
    return { ...invoice, status: "unpaid" };
  }
  return invoice;
}

export interface DuplicateInvoiceInput {
  amount: number;
  clientId: string;
  description: string;
  discountRate: number;
  dueDate: string;
  items: InvoiceItemInput[];
  status: "paid" | "unpaid";
  taxRate: number;
}

/**
 * The input for duplicating an invoice: same client, terms and due
 * date, and the same line items, but always unpaid with no payments
 * carried over. The new number and issued date are assigned when the
 * copy is created, and the due date can be changed with the edit form
 * afterwards.
 */
export function buildDuplicateInput(invoice: Invoice): DuplicateInvoiceInput {
  return {
    amount: invoice.amount,
    clientId: invoice.clientId,
    description: invoice.description,
    discountRate: invoice.discountRate,
    dueDate: invoice.dueDate,
    items: (invoice.items ?? []).map((it) => ({
      description: it.description,
      quantity: it.quantity,
      unitPrice: it.unitPrice,
    })),
    status: "unpaid",
    taxRate: invoice.taxRate,
  };
}

export function computeTotals(
  invoices: Invoice[],
  clients: Client[],
  today: string,
): Totals {
  let totalPaid = 0;
  let totalOutstanding = 0;
  let overdueCount = 0;
  let overdueAmount = 0;
  for (const inv of invoices) {
    const total = computeInvoiceTotal(inv);
    if (inv.status === "paid") {
      totalPaid += total;
    } else {
      totalOutstanding += total;
      if (isOverdue(inv, today)) {
        overdueCount += 1;
        overdueAmount += total;
      }
    }
  }
  return {
    clientCount: clients.length,
    invoiceCount: invoices.length,
    overdueAmount: roundMoney(overdueAmount),
    overdueCount,
    totalOutstanding: roundMoney(totalOutstanding),
    totalPaid: roundMoney(totalPaid),
  };
}

export interface ClientTotals {
  overdueAmount: number;
  overdueCount: number;
  totalBilled: number;
  totalOutstanding: number;
  totalPaid: number;
}

/** Remaining balance per client, for list views. Clients with no invoices are absent. */
export function outstandingByClient(
  invoices: Invoice[],
  payments: Payment[],
): Record<string, number> {
  const byInvoice = new Map<string, Payment[]>();
  for (const p of payments) {
    const list = byInvoice.get(p.invoiceId) ?? [];
    list.push(p);
    byInvoice.set(p.invoiceId, list);
  }
  const out: Record<string, number> = {};
  for (const inv of invoices) {
    out[inv.clientId] = roundMoney((out[inv.clientId] ?? 0) + computeRemainingBalance(inv, byInvoice.get(inv.id) ?? []));
  }
  return out;
}

/**
 * Payment-aware totals for one client's invoices: billed is the sum of
 * invoice totals, paid is the sum of recorded payments, outstanding is
 * the sum of remaining balances, and overdue counts only invoices still
 * past due with a balance left. Unlike computeTotals, a part-paid
 * invoice counts as part-paid, not as fully outstanding.
 */
export function computeClientTotals(
  invoices: Invoice[],
  payments: Payment[],
  today: string,
): ClientTotals {
  const byInvoice = new Map<string, Payment[]>();
  for (const p of payments) {
    const list = byInvoice.get(p.invoiceId) ?? [];
    list.push(p);
    byInvoice.set(p.invoiceId, list);
  }
  let totalBilled = 0;
  let totalPaid = 0;
  let totalOutstanding = 0;
  let overdueCount = 0;
  let overdueAmount = 0;
  for (const inv of invoices) {
    const mine = byInvoice.get(inv.id) ?? [];
    const balance = computeRemainingBalance(inv, mine);
    totalBilled += computeInvoiceTotal(inv);
    totalPaid += computeAmountPaid(mine);
    totalOutstanding += balance;
    if (balance > 0 && isOverdue(inv, today)) {
      overdueCount += 1;
      overdueAmount += balance;
    }
  }
  return {
    overdueAmount: roundMoney(overdueAmount),
    overdueCount,
    totalBilled: roundMoney(totalBilled),
    totalOutstanding: roundMoney(totalOutstanding),
    totalPaid: roundMoney(totalPaid),
  };
}

export function roundMoney(n: number): number {
  return Math.round(n * 100) / 100;
}

export function filterClients(clients: Client[], query: string): Client[] {
  const q = query.trim().toLowerCase();
  if (!q) return [...clients];
  return clients.filter((c) =>
    [c.name, c.email ?? "", c.company ?? "", c.phone ?? ""]
      .join(" ")
      .toLowerCase()
      .includes(q),
  );
}

export function filterInvoices(
  invoices: Invoice[],
  clients: Client[],
  query: string,
  filter: InvoiceFilter,
  today: string,
  // Optional due-date window. Empty strings mean "no bound"; both bounds
  // are inclusive, so "due from 2026-11-01 to 2026-11-30" keeps invoices
  // due on either end of the range. Dates are YYYY-MM-DD, so plain
  // string comparison orders them correctly.
  options?: { dueFrom?: string; dueTo?: string },
): Invoice[] {
  const q = query.trim().toLowerCase();
  const dueFrom = options?.dueFrom?.trim() ?? "";
  const dueTo = options?.dueTo?.trim() ?? "";
  const byId = new Map(clients.map((c) => [c.id, c]));
  return invoices.filter((inv) => {
    if (filter === "paid" && inv.status !== "paid") return false;
    if (filter === "unpaid" && inv.status !== "unpaid") return false;
    if (filter === "overdue" && !isOverdue(inv, today)) return false;
    if (dueFrom && inv.dueDate < dueFrom) return false;
    if (dueTo && inv.dueDate > dueTo) return false;
    if (!q) return true;
    const client = byId.get(inv.clientId);
    return [inv.description, client?.name ?? "", client?.company ?? ""]
      .join(" ")
      .toLowerCase()
      .includes(q);
  });
}

export function sortInvoicesRecent(invoices: Invoice[]): Invoice[] {
  return [...invoices].sort((a, b) =>
    b.issuedDate.localeCompare(a.issuedDate) ||
    b.dueDate.localeCompare(a.dueDate),
  );
}

/**
 * Display number for an invoice: INV-001, INV-002, … — zero-padded to 3,
 * growing past 999 naturally (INV-1000). Null when the invoice predates
 * numbering and has no number assigned.
 */
export function formatInvoiceNumber(number: number | null): string {
  if (number === null) return "—";
  return `INV-${String(number).padStart(3, "0")}`;
}

export function formatMoney(amount: number): string {
  return `$${amount.toLocaleString("en-US", {
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
  })}`;
}

/** The demo data a new account starts with: 3 clients and 5 invoices.
 * It is just a list — no logic here. Dates are relative to today,
 * so one invoice is always overdue. */
export function seedData(today: string): { clients: Client[]; invoices: Invoice[] } {
  const clients: Client[] = [
    {
      archived: false,
      company: "Northside Bakery",
      createdAt: addDays(today, -40),
      email: "sara@northsidebakery.example",
      id: "seed-client-1",
      name: "Sara Khan",
      phone: "+92 300 111 2222",
    },
    {
      archived: false,
      company: "Peak Fitness Studio",
      createdAt: addDays(today, -25),
      email: "omar@peakfitness.example",
      id: "seed-client-2",
      name: "Omar Raza",
    },
    {
      archived: false,
      company: "Blue Door Interiors",
      createdAt: addDays(today, -10),
      email: "ayesha@bluedoor.example",
      id: "seed-client-3",
      name: "Ayesha Malik",
      phone: "+92 321 333 4444",
    },
  ];
  const invoices: Invoice[] = [
    {
      amount: 450,
      clientId: "seed-client-1",
      description: "Website redesign — homepage and menu pages",
      discountRate: 0,
      number: null,
      taxRate: 0,
      dueDate: addDays(today, -5),
      id: "seed-invoice-1",
      issuedDate: addDays(today, -20),
      status: "unpaid",
    },
    {
      amount: 1200,
      clientId: "seed-client-2",
      description: "Booking site build, milestone 1",
      discountRate: 0,
      number: null,
      taxRate: 0,
      dueDate: addDays(today, 12),
      id: "seed-invoice-2",
      issuedDate: addDays(today, -8),
      status: "unpaid",
    },
    {
      amount: 300,
      clientId: "seed-client-3",
      description: "Portfolio site — content and image updates",
      discountRate: 0,
      number: null,
      taxRate: 0,
      dueDate: addDays(today, -2),
      id: "seed-invoice-3",
      issuedDate: addDays(today, -15),
      status: "paid",
    },
    {
      amount: 850,
      clientId: "seed-client-1",
      description: "Online ordering page",
      discountRate: 0,
      number: null,
      taxRate: 0,
      dueDate: addDays(today, 5),
      id: "seed-invoice-4",
      issuedDate: addDays(today, -3),
      status: "unpaid",
    },
    {
      amount: 600,
      clientId: "seed-client-2",
      description: "Maintenance — January",
      discountRate: 0,
      number: null,
      taxRate: 0,
      dueDate: addDays(today, -30),
      id: "seed-invoice-5",
      issuedDate: addDays(today, -35),
      status: "paid",
    },
  ];
  return { clients, invoices };
}
