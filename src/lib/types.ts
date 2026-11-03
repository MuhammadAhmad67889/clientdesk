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
  status: InvoiceStatus;
  taxRate: number; // percent, 0–100; applied to the discounted amount
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
