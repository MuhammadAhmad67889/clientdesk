export type InvoiceStatus = "paid" | "unpaid";

export interface Client {
  company?: string;
  createdAt: string;
  email?: string;
  id: string;
  name: string;
  notes?: string;
  phone?: string;
}

export interface Invoice {
  amount: number;
  clientId: string;
  description: string;
  discountRate: number; // percent, 0–100; applied before tax
  dueDate: string; // YYYY-MM-DD
  id: string;
  issuedDate: string; // YYYY-MM-DD
  number: number | null; // per-user sequence; null for pre-numbering invoices
  status: InvoiceStatus;
  taxRate: number; // percent, 0–100; applied to the discounted amount
}

/** A monthly retainer template. Generating creates one invoice per due template. */
export interface RecurringTemplate {
  amount: number;
  clientId: string;
  createdAt: string;
  description: string;
  discountRate: number;
  id: string;
  nextDueDate: string; // YYYY-MM-DD
  taxRate: number;
  userId: string;
}

/** One recorded part- or full-payment against an invoice. */
export interface Payment {
  amount: number;
  id: string;
  invoiceId: string;
  paidAt: string; // YYYY-MM-DD
  userId: string;
}

export type InvoiceFilter = "all" | "paid" | "unpaid" | "overdue";

export interface Totals {
  clientCount: number;
  invoiceCount: number;
  overdueAmount: number;
  overdueCount: number;
  totalOutstanding: number;
  totalPaid: number;
}
