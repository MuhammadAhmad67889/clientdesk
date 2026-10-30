import { describe, expect, it } from "vitest";
import { invoicesToCsv, parseClientsCsv } from "./csv";
import type { Client, Invoice } from "./types";

const clients: Client[] = [
  { createdAt: "2026-10-01", id: "c1", name: "Sara Khan" },
];
const invoice: Invoice = {
  amount: 450,
  clientId: "c1",
  description: "Website, homepage",
  dueDate: "2026-10-24",
  id: "inv-1",
  issuedDate: "2026-10-09",
  status: "unpaid",
};

describe("invoicesToCsv", () => {
  it("writes header and one row with overdue derived status", () => {
    const csv = invoicesToCsv([invoice], clients, "2026-10-29");
    expect(csv).toBe(
      "Invoice ID,Client,Description,Amount,Status,Issued,Due\n" +
        'inv-1,Sara Khan,"Website, homepage",450.00,overdue,2026-10-09,2026-10-24\n',
    );
  });
  it("escapes quotes and uses unknown client for missing client", () => {
    const csv = invoicesToCsv(
      [{ ...invoice, description: 'Say "hi"', id: "inv-2" }],
      [],
      "2026-10-29",
    );
    expect(csv).toContain('"Say ""hi"""');
    expect(csv).toContain("Unknown client");
  });
  it("writes only the header for no invoices", () => {
    expect(invoicesToCsv([], clients, "2026-10-29")).toBe(
      "Invoice ID,Client,Description,Amount,Status,Issued,Due\n",
    );
  });
});

describe("parseClientsCsv", () => {
  it("parses a header in any order and quoted fields", () => {
    const { rows, skipped } = parseClientsCsv(
      'email,name,company\nsara@example.com,"Khan, Sara",Northside Bakery\n',
    );
    expect(skipped).toBe(0);
    expect(rows).toEqual([
      { company: "Northside Bakery", email: "sara@example.com", name: "Khan, Sara", notes: undefined, phone: undefined },
    ]);
  });
  it("skips rows without a name or with a bad email", () => {
    const { rows, skipped } = parseClientsCsv(
      "name,email\n,blank@example.com\nBad Email,not-an-email\nGood One,good@example.com\n",
    );
    expect(skipped).toBe(2);
    expect(rows.map((r) => r.name)).toEqual(["Good One"]);
  });
  it("returns no rows when the header has no name column", () => {
    const { rows, skipped } = parseClientsCsv("email\nsomeone@example.com\n");
    expect(rows).toEqual([]);
    expect(skipped).toBe(1);
  });
});
