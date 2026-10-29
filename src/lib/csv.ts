import type { Client, Invoice } from "./types";
import { isOverdue } from "./invoices";

function escapeCell(value: string): string {
  if (/[",\n\r]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export function invoicesToCsv(
  invoices: Invoice[],
  clients: Client[],
  today: string,
): string {
  const byId = new Map(clients.map((c) => [c.id, c]));
  const header = ["Invoice ID", "Client", "Description", "Amount", "Status", "Issued", "Due"].join(",");
  const rows = invoices.map((inv) => {
    const client = byId.get(inv.clientId);
    const status = isOverdue(inv, today) ? "overdue" : inv.status;
    return [
      escapeCell(inv.id),
      escapeCell(client?.name ?? "Unknown client"),
      escapeCell(inv.description),
      inv.amount.toFixed(2),
      escapeCell(status),
      escapeCell(inv.issuedDate),
      escapeCell(inv.dueDate),
    ].join(",");
  });
  return [header, ...rows].join("\n") + "\n";
}
