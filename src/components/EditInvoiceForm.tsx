"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import InvoiceItemsEditor from "./InvoiceItemsEditor";
import { computeItemsSubtotal, validateInvoiceItems } from "../lib/invoices";
import type { InvoiceItemInput } from "../lib/invoices";
import type { Invoice } from "../lib/types";

export default function EditInvoiceForm({ invoice }: { invoice: Invoice }) {
  const router = useRouter();
  const [amount, setAmount] = useState(String(invoice.amount));
  const [description, setDescription] = useState(invoice.description);
  const [discountRate, setDiscountRate] = useState(String(invoice.discountRate));
  const [taxRate, setTaxRate] = useState(String(invoice.taxRate));
  const [dueDate, setDueDate] = useState(invoice.dueDate);
  const [useItems, setUseItems] = useState((invoice.items?.length ?? 0) > 0);
  const [items, setItems] = useState<InvoiceItemInput[]>(
    invoice.items && invoice.items.length > 0
      ? invoice.items.map((it) => ({ description: it.description, quantity: it.quantity, unitPrice: it.unitPrice }))
      : [{ description: "", quantity: 1, unitPrice: 0 }],
  );
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (saving) return;
    setSaving(true);
    setErrors({});
    // Switching back to a single amount clears the stored items, so
    // the amount and the items can never disagree afterwards.
    let parsedAmount = Number(amount);
    if (useItems) {
      const itemsError = validateInvoiceItems(items);
      if (itemsError) {
        setErrors({ form: itemsError });
        setSaving(false);
        return;
      }
      parsedAmount = computeItemsSubtotal(items);
    }
    const res = await fetch(`/api/invoices/${invoice.id}`, {
      body: JSON.stringify({
        amount: parsedAmount,
        description,
        discountRate: Number(discountRate),
        dueDate,
        items: useItems ? items : [],
        taxRate: Number(taxRate),
      }),
      headers: { "Content-Type": "application/json" },
      method: "PUT",
    });
    setSaving(false);
    if (res.status === 401) {
      window.location.href = "/login";
      return;
    }
    if (!res.ok) {
      const data = (await res.json().catch(() => null)) as { errors?: Record<string, string>; error?: string } | null;
      setErrors(data?.errors ?? { form: data?.error ?? "Could not save the changes." });
      return;
    }
    setNote("Changes saved.");
    router.refresh();
  }

  return (
    <form className="grid" onSubmit={submit}>
      <label>Description *
        <input value={description} onChange={(e) => setDescription(e.target.value)} />
      </label>
      {!useItems && (
        <label>Amount ($) *
          <input type="number" min="0" step="0.01" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} />
        </label>
      )}
      <label className="full">
        <input type="checkbox" checked={useItems} onChange={(e) => setUseItems(e.target.checked)} /> Use line items instead of a single amount
      </label>
      {useItems && <InvoiceItemsEditor items={items} onChange={setItems} />}
      <label>Discount (%)
        <input type="number" min="0" max="100" step="0.01" inputMode="decimal" value={discountRate} onChange={(e) => setDiscountRate(e.target.value)} />
      </label>
      <label>Tax (%)
        <input type="number" min="0" max="100" step="0.01" inputMode="decimal" value={taxRate} onChange={(e) => setTaxRate(e.target.value)} />
      </label>
      <label>Due date *
        <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
      </label>
      {Object.entries(errors).map(([key, message]) => (
        <p className="error full" key={key} role="alert">{message}</p>
      ))}
      <div className="actions full">
        <button className="primary" disabled={saving} type="submit">{saving ? "Saving…" : "Save changes"}</button>
        {note && <span className="hint" role="status">{note}</span>}
      </div>
      <p className="hint full" style={{ margin: 0 }}>The client, invoice number, issued date and recorded payments never change here.</p>
    </form>
  );
}
