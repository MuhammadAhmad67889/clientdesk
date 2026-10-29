import type { Client, Invoice, InvoiceFilter, Totals } from "./types";

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
    if (inv.status === "paid") {
      totalPaid += inv.amount;
    } else {
      totalOutstanding += inv.amount;
      if (isOverdue(inv, today)) {
        overdueCount += 1;
        overdueAmount += inv.amount;
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
): Invoice[] {
  const q = query.trim().toLowerCase();
  const byId = new Map(clients.map((c) => [c.id, c]));
  return invoices.filter((inv) => {
    if (filter === "paid" && inv.status !== "paid") return false;
    if (filter === "unpaid" && inv.status !== "unpaid") return false;
    if (filter === "overdue" && !isOverdue(inv, today)) return false;
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

export function formatMoney(amount: number): string {
  return `$${amount.toLocaleString("en-US", {
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
  })}`;
}

export function seedData(today: string): { clients: Client[]; invoices: Invoice[] } {
  const clients: Client[] = [
    {
      company: "Northside Bakery",
      createdAt: addDays(today, -40),
      email: "sara@northsidebakery.example",
      id: "seed-client-1",
      name: "Sara Khan",
      phone: "+92 300 111 2222",
    },
    {
      company: "Peak Fitness Studio",
      createdAt: addDays(today, -25),
      email: "omar@peakfitness.example",
      id: "seed-client-2",
      name: "Omar Raza",
    },
    {
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
      dueDate: addDays(today, -5),
      id: "seed-invoice-1",
      issuedDate: addDays(today, -20),
      status: "unpaid",
    },
    {
      amount: 1200,
      clientId: "seed-client-2",
      description: "Booking site build, milestone 1",
      dueDate: addDays(today, 12),
      id: "seed-invoice-2",
      issuedDate: addDays(today, -8),
      status: "unpaid",
    },
    {
      amount: 300,
      clientId: "seed-client-3",
      description: "Portfolio site — content and image updates",
      dueDate: addDays(today, -2),
      id: "seed-invoice-3",
      issuedDate: addDays(today, -15),
      status: "paid",
    },
    {
      amount: 850,
      clientId: "seed-client-1",
      description: "Online ordering page",
      dueDate: addDays(today, 5),
      id: "seed-invoice-4",
      issuedDate: addDays(today, -3),
      status: "unpaid",
    },
    {
      amount: 600,
      clientId: "seed-client-2",
      description: "Maintenance — January",
      dueDate: addDays(today, -30),
      id: "seed-invoice-5",
      issuedDate: addDays(today, -35),
      status: "paid",
    },
  ];
  return { clients, invoices };
}
