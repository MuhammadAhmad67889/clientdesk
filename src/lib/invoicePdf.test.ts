import { describe, expect, it } from "vitest";
import { PDFDocument } from "pdf-lib";
import { buildInvoicePdf } from "./invoicePdf";
import type { Client, Invoice } from "./types";

const invoice: Invoice = {
  amount: 450,
  clientId: "c1",
  description: "Website redesign — homepage and menu pages",
  discountRate: 0,
  dueDate: "2026-11-15",
  id: "inv-1",
  issuedDate: "2026-10-20",
  number: 1,
  status: "unpaid",
  taxRate: 0,
};
const client: Client = {
  company: "Northside Bakery",
  createdAt: "2026-10-01",
  email: "sara@example.com",
  id: "c1",
  name: "Sara Khan",
};

describe("buildInvoicePdf", () => {
  it("produces a valid one-page PDF", async () => {
    const bytes = await buildInvoicePdf(invoice, client, "Unpaid");
    expect(new TextDecoder().decode(bytes.slice(0, 5))).toBe("%PDF-");
    const loaded = await PDFDocument.load(bytes);
    expect(loaded.getPageCount()).toBe(1);
    expect(loaded.getTitle()).toContain("Website redesign");
  });
  it("works without a client record", async () => {
    const bytes = await buildInvoicePdf(invoice, undefined, "Paid");
    const loaded = await PDFDocument.load(bytes);
    expect(loaded.getPageCount()).toBe(1);
  });
  it("wraps a long description instead of overflowing the page", async () => {
    const bytes = await buildInvoicePdf(
      { ...invoice, description: "Website redesign ".repeat(20).trim() },
      client,
      "Unpaid",
    );
    const loaded = await PDFDocument.load(bytes);
    expect(loaded.getPageCount()).toBe(1);
  });
});
