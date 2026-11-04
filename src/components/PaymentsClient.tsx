"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import Field from "./Field";
import Reveal from "./Reveal";
import { formatInvoiceNumber, formatMoney } from "../lib/invoices";
import { buildPaymentRows, remainingByInvoice, summarizePaymentRows } from "../lib/payments";
import type { Client, Invoice, Payment } from "../lib/types";

/** A fresh idempotency key per form, so a double-click on submit
 * returns the first payment instead of recording it twice. */
function newIdempotencyKey(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;
}

export default function PaymentsClient({
  initialClients,
  initialInvoices,
  initialPayments,
}: {
  initialClients: Client[];
  initialInvoices: Invoice[];
  initialPayments: Payment[];
}) {
  const router = useRouter();
  const [tab, setTab] = useState<"all" | "payment" | "pending">("all");
  const [invoiceId, setInvoiceId] = useState("");
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("");
  const [reference, setReference] = useState("");
  const [idempotencyKey, setIdempotencyKey] = useState(newIdempotencyKey);
  const [error, setError] = useState("");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  const rows = buildPaymentRows(initialPayments, initialInvoices, initialClients);
  const totals = summarizePaymentRows(rows);
  const remaining = remainingByInvoice(initialInvoices, initialPayments);
  const unpaid = initialInvoices
    .filter((inv) => (remaining.get(inv.id) ?? 0) > 0)
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate));
  const shown = tab === "all" ? rows : rows.filter((r) => r.kind === tab);
  const byId = new Map(initialClients.map((c) => [c.id, c]));

  function pickInvoice(id: string) {
    setInvoiceId(id);
    // Default to the full remaining balance; the user can lower it
    // for a part-payment.
    setAmount(id ? String(remaining.get(id) ?? "") : "");
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (saving || !invoiceId) return;
    setSaving(true);
    setError("");
    setNote("");
    const res = await fetch(`/api/invoices/${invoiceId}/payments`, {
      body: JSON.stringify({
        amount: Number(amount),
        idempotencyKey,
        method: method.trim() || undefined,
        reference: reference.trim() || undefined,
      }),
      headers: { "Content-Type": "application/json" },
      method: "POST",
    });
    setSaving(false);
    if (res.status === 401) {
      window.location.href = "/login";
      return;
    }
    if (!res.ok) {
      const data = (await res.json().catch(() => null)) as { errors?: Record<string, string>; error?: string } | null;
      setError(data?.errors?.amount ?? data?.errors?.form ?? data?.error ?? "Could not record the payment.");
      return;
    }
    setMethod("");
    setReference("");
    setIdempotencyKey(newIdempotencyKey());
    setNote("Payment recorded.");
    // The page is a server component, so this re-fetches its props
    // and the new payment appears in the list below.
    router.refresh();
  }

  return (
    <Reveal>
      <div className="page-head">
        <h1>Payments</h1>
        <p className="lead">Money actually received, and balances still owed — from your real invoices and payments.</p>
      </div>

      <div className="stats">
        <div className="stat" data-reveal><span>Received</span><strong>{formatMoney(totals.received)}</strong><small>Recorded payments</small></div>
        <div className="stat" data-reveal><span>Still owed</span><strong>{formatMoney(totals.pending)}</strong><small>Unpaid balances</small></div>
      </div>

      <div className="card" data-reveal>
        <h2>Record a payment</h2>
        {unpaid.length === 0 ? (
          <p className="hint">Nothing owed — every invoice is paid in full.</p>
        ) : (
          <form className="grid" onSubmit={submit}>
            <Field label="Invoice *">
              <select onChange={(e) => pickInvoice(e.target.value)} value={invoiceId}>
                <option value="">Choose an unpaid invoice</option>
                {unpaid.map((inv) => (
                  <option key={inv.id} value={inv.id}>
                    {formatInvoiceNumber(inv.number)} — {byId.get(inv.clientId)?.name ?? "Unknown client"} — {formatMoney(remaining.get(inv.id) ?? 0)} owed
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Amount ($) *">
              <input
                inputMode="decimal"
                min="0"
                onChange={(e) => setAmount(e.target.value)}
                placeholder="100.00"
                step="0.01"
                type="number"
                value={amount}
              />
            </Field>
            <Field label="Method — optional">
              <input
                onChange={(e) => setMethod(e.target.value)}
                placeholder="Bank transfer, Cash, Card…"
                value={method}
              />
            </Field>
            <Field label="Transaction reference — optional">
              <input
                onChange={(e) => setReference(e.target.value)}
                placeholder="e.g. bank transaction id"
                value={reference}
              />
            </Field>
            <div className="actions">
              <button disabled={saving || !invoiceId} type="submit">{saving ? "Saving…" : "Record payment"}</button>
              {error && <span className="error" role="alert">{error}</span>}
              {note && <span className="hint" role="status">{note}</span>}
            </div>
          </form>
        )}
      </div>

      <div className="toolbar" role="group" aria-label="Filter payments">
        {(["all", "payment", "pending"] as const).map((t) => (
          <button key={t} aria-pressed={tab === t} onClick={() => setTab(t)} type="button">
            {t === "all" ? "All" : t === "payment" ? "Completed" : "Pending"}
          </button>
        ))}
      </div>

      {shown.length === 0 ? (
        <div className="card" data-reveal>
          <p className="hint">Nothing here yet. Recorded payments show under Completed; unpaid balances show under Pending.</p>
        </div>
      ) : (
        <div className="card table-wrap" data-reveal>
          <table>
            <thead><tr><th>Date</th><th>Invoice</th><th>Client</th><th>Amount</th><th>Status</th><th>Details</th><th>Actions</th></tr></thead>
            <tbody>
              {shown.map((row) => (
                <tr key={`${row.kind}-${row.invoiceId}-${row.date}-${row.amount}`}>
                  <td data-label="Date">{row.date}</td>
                  <td data-label="Invoice">{row.invoiceNumber}</td>
                  <td data-label="Client">{row.clientName}</td>
                  <td data-label="Amount">{formatMoney(row.amount)}</td>
                  <td data-label="Status">
                    {row.kind === "payment" ? (
                      <span className="badge badge-paid">Completed</span>
                    ) : (
                      <span className="badge badge-unpaid">Pending</span>
                    )}
                  </td>
                  <td data-label="Details">
                    {row.kind === "payment"
                      ? [row.method, row.reference ? `ref ${row.reference}` : null].filter(Boolean).join(" · ") || "—"
                      : `Due ${row.date}`}
                  </td>
                  <td data-label="Actions">
                    <Link className="btn" href={`/invoices/${row.invoiceId}`}>View invoice</Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <p className="hint">No scheduled payments and no refunds here: the app records payments when they arrive, and that is all this list claims.</p>
    </Reveal>
  );
}
