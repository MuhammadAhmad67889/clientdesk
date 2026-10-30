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
): string {  const byId = new Map(clients.map((c) => [c.id, c]));
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

/** Parse one CSV record, honouring quoted fields and "" escapes. */
function parseCsvLine(line: string): string[] {
  const cells: string[] = [];
  let cell = "";
  let quoted = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (quoted) {
      if (ch === '"') {
        if (line[i + 1] === '"') {
          cell += '"';
          i++;
        } else {
          quoted = false;
        }
      } else {
        cell += ch;
      }
    } else if (ch === '"') {
      quoted = true;
    } else if (ch === ",") {
      cells.push(cell);
      cell = "";
    } else {
      cell += ch;
    }
  }
  cells.push(cell);
  return cells.map((c) => c.trim());
}

export interface ParsedClients {
  rows: { company?: string; email?: string; name: string; notes?: string; phone?: string }[];
  skipped: number;
}

/**
 * Import format: a header row with at least "name", plus any of
 * email, company, phone, notes (order does not matter). Rows without a
 * name, or with an invalid email, are counted as skipped, never imported.
 */
export function parseClientsCsv(text: string): ParsedClients {
  const lines = text.split(/\r?\n/).filter((l) => l.trim() !== "");
  if (lines.length === 0) return { rows: [], skipped: 0 };
  const header = parseCsvLine(lines[0]).map((h) => h.toLowerCase());
  const col = (name: string) => header.indexOf(name);
  if (col("name") === -1) return { rows: [], skipped: lines.length - 1 };
  const rows: ParsedClients["rows"] = [];
  let skipped = 0;
  for (const line of lines.slice(1)) {
    const cells = parseCsvLine(line);
    const pick = (name: string) => {
      const i = col(name);
      return i >= 0 ? cells[i] ?? "" : "";
    };
    const name = pick("name");
    const email = pick("email");
    if (!name || (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))) {
      skipped++;
      continue;
    }
    rows.push({
      company: pick("company") || undefined,
      email: email || undefined,
      name,
      notes: pick("notes") || undefined,
      phone: pick("phone") || undefined,
    });
  }
  return { rows, skipped };
}
