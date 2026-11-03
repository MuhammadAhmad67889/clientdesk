"use client";

import { computeItemsSubtotal, formatMoney } from "../lib/invoices";
import type { InvoiceItemInput } from "../lib/invoices";

/** Editable line items for an invoice form. The subtotal shown here
 * becomes the invoice amount on save, so discount and tax apply to
 * it exactly as they apply to a single amount. */
export default function InvoiceItemsEditor({
  items,
  onChange,
}: {
  items: InvoiceItemInput[];
  onChange: (items: InvoiceItemInput[]) => void;
}) {
  function update(index: number, patch: Partial<InvoiceItemInput>) {
    onChange(items.map((it, i) => (i === index ? { ...it, ...patch } : it)));
  }
  return (
    <div className="full" style={{ display: "grid", gap: 8 }}>
      {items.map((it, i) => (
        <div key={i} className="item-row">
          <label>Description
            <input onChange={(e) => update(i, { description: e.target.value })} placeholder="Design work" value={it.description} />
          </label>
          <label>Qty
            <input
              inputMode="decimal"
              min="0"
              onChange={(e) => update(i, { quantity: Number(e.target.value) })}
              step="0.01"
              type="number"
              value={it.quantity === 0 ? "" : String(it.quantity)}
            />
          </label>
          <label>Unit price ($)
            <input
              inputMode="decimal"
              min="0"
              onChange={(e) => update(i, { unitPrice: Number(e.target.value) })}
              step="0.01"
              type="number"
              value={it.unitPrice === 0 ? "" : String(it.unitPrice)}
            />
          </label>
          <button disabled={items.length <= 1} onClick={() => onChange(items.filter((_, j) => j !== i))} type="button">Remove</button>
        </div>
      ))}
      <div className="actions">
        <button onClick={() => onChange([...items, { description: "", quantity: 1, unitPrice: 0 }])} type="button">Add line item</button>
        <span className="hint">Subtotal: <strong>{formatMoney(computeItemsSubtotal(items))}</strong> — discount and tax apply to this, as with a single amount.</span>
      </div>
    </div>
  );
}
