import { describe, expect, it } from "vitest";
import {
  applyInvoiceEdit,
  buildDuplicateInput,
  computeItemsSubtotal,
  parseInvoiceItems,
  validateInvoiceItems,
} from "./invoices";
import type { Invoice } from "./types";

const base: Invoice = {
  amount: 100,
  clientId: "c1",
  description: "Work",
  discountRate: 0,
  dueDate: "2026-11-15",
  id: "i1",
  issuedDate: "2026-11-01",
  number: 1,
  status: "unpaid",
  taxRate: 0,
};

describe("line items", () => {
  it("sums quantity × unit price, rounded to cents", () => {
    expect(computeItemsSubtotal([
      { description: "Design", quantity: 2, unitPrice: 50 },
      { description: "Hosting", quantity: 1.5, unitPrice: 10.005 },
    ])).toBe(115.01);
    expect(computeItemsSubtotal([])).toBe(0);
  });

  it("rejects empty descriptions, non-positive quantities, and negative prices", () => {
    expect(validateInvoiceItems([])).toMatch(/at least one/);
    expect(validateInvoiceItems([{ description: " ", quantity: 1, unitPrice: 1 }])).toMatch(/description/);
    expect(validateInvoiceItems([{ description: "X", quantity: 0, unitPrice: 1 }])).toMatch(/quantity/);
    expect(validateInvoiceItems([{ description: "X", quantity: 1, unitPrice: -1 }])).toMatch(/price/);
    expect(validateInvoiceItems([{ description: "X", quantity: 1, unitPrice: 0 }])).toBeNull();
  });

  it("an edit with items replaces the amount with the items subtotal", () => {
    const updated = applyInvoiceEdit(base, [], {
      amount: 999,
      description: "Work",
      discountRate: 0,
      dueDate: "2026-11-15",
      items: [{ description: "A", quantity: 3, unitPrice: 20 }],
      taxRate: 0,
    });
    expect(updated.amount).toBe(60);
  });

  it("a duplicate copies the line items but stays unpaid", () => {
    const withItems: Invoice = {
      ...base,
      items: [{ description: "A", id: "it1", quantity: 2, unitPrice: 25 }],
    };
    const dup = buildDuplicateInput(withItems);
    expect(dup.items).toEqual([{ description: "A", quantity: 2, unitPrice: 25 }]);
    expect(dup.status).toBe("unpaid");
  });

  it("parses request items and rejects malformed ones", () => {
    expect(parseInvoiceItems([
      { description: " A ", quantity: 2, unitPrice: 10.005 },
    ])).toEqual([{ description: "A", quantity: 2, unitPrice: 10.01 }]);
    expect(parseInvoiceItems("nope")).toBeNull();
    expect(parseInvoiceItems([{ description: "A", quantity: "x", unitPrice: 1 }])).toBeNull();
    expect(parseInvoiceItems([{ quantity: 1, unitPrice: 1 }])).toBeNull();
  });
});
