"use client";

import Link from "next/link";
import { Search, Users } from "lucide-react";
import { Fragment, useMemo, useState } from "react";
import Reveal from "./Reveal";
import ReminderDraft from "./ReminderDraft";
import { EmptyState, StatusBadge } from "./ui";
import Pagination, { PAGE_SIZE } from "./Pagination";
import InvoiceItemsEditor from "./InvoiceItemsEditor";
import { invoicesToCsv } from "../lib/csv";
import { computeAmountPaid, computeInvoiceTotal, computeItemsSubtotal, computeRemainingBalance, filterInvoices, formatInvoiceNumber, formatMoney, isOverdue, todayIso, validateInvoiceItems } from "../lib/invoices";
import { newIdempotencyKey, remainingByInvoice } from "../lib/payments";
import { recurringDueLabel } from "../lib/recurring";
import type { InvoiceItemInput } from "../lib/invoices";
import type { Client, Invoice, InvoiceFilter, Payment, RecurringTemplate } from "../lib/types";
import { validateInvoice } from "../lib/validation";

type SortKey = "due-asc" | "issued-desc" | "amount-desc";

export default function InvoicesClient({
  initialClients,
  initialInvoices,
  initialPayments,
  initialRecurring,
}: {
  initialClients: Client[];
  initialInvoices: Invoice[];
  initialPayments: Payment[];
  initialRecurring: RecurringTemplate[];
}) {
  const [clients] = useState(initialClients);
  const [invoices, setInvoices] = useState(initialInvoices);
  const [payments, setPayments] = useState(initialPayments);
  const [recurring, setRecurring] = useState(initialRecurring);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<InvoiceFilter>("all");
  const [dueFrom, setDueFrom] = useState("");
  const [dueTo, setDueTo] = useState("");
  const [sort, setSort] = useState<SortKey>("due-asc");
  const [page, setPage] = useState(1);
  const [clientId, setClientId] = useState("");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [useItems, setUseItems] = useState(false);
  const [items, setItems] = useState<InvoiceItemInput[]>([{ description: "", quantity: 1, unitPrice: 0 }]);
  const [discountRate, setDiscountRate] = useState("");
  const [taxRate, setTaxRate] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [savedNote, setSavedNote] = useState("");
  const [rClientId, setRClientId] = useState("");
  const [rDescription, setRDescription] = useState("");
  const [rAmount, setRAmount] = useState("");
  const [rDiscount, setRDiscount] = useState("");
  const [rTax, setRTax] = useState("");
  const [rNextDue, setRNextDue] = useState("");
  const [rErrors, setRErrors] = useState<Record<string, string>>({});
  const [rNote, setRNote] = useState("");
  const [generating, setGenerating] = useState(false);
  const [generatingId, setGeneratingId] = useState<string | null>(null);
  // Quick record-payment form, opened from one invoice row at a time.
  const [payForId, setPayForId] = useState<string | null>(null);
  const [payAmount, setPayAmount] = useState("");
  const [payDate, setPayDate] = useState("");
  const [payMethod, setPayMethod] = useState("");
  const [payReference, setPayReference] = useState("");
  const [payError, setPayError] = useState("");
  const [paySaving, setPaySaving] = useState(false);
  // Reminder draft, opened from one overdue row at a time. The draft
  // itself is never sent — it is copied into the user's own email.
  const [remindForId, setRemindForId] = useState<string | null>(null);

  const today = todayIso();
  const filtered = useMemo(() => {
    const list = filterInvoices(invoices, clients, query, filter, today, { dueFrom, dueTo });
    const sorted = [...list];
    if (sort === "amount-desc") sorted.sort((a, b) => b.amount - a.amount);
    else if (sort === "issued-desc") sorted.sort((a, b) => b.issuedDate.localeCompare(a.issuedDate));
    else sorted.sort((a, b) => a.dueDate.localeCompare(b.dueDate));
    return sorted;
  }, [invoices, clients, query, filter, sort, today, dueFrom, dueTo]);
  const byId = useMemo(() => new Map(clients.map((c) => [c.id, c])), [clients]);
  // What is still owed per invoice, so the quick payment form can
  // prefill the remaining balance and the list can hide it at zero.
  const remaining = useMemo(() => remainingByInvoice(invoices, payments), [invoices, payments]);
  // Archived clients keep their history, but new invoices and
  // retainers are only offered for active clients.
  const activeClients = useMemo(() => clients.filter((c) => !c.archived), [clients]);
  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const displayPage = Math.min(page, pageCount);
  const paged = filtered.slice((displayPage - 1) * PAGE_SIZE, displayPage * PAGE_SIZE);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const parsedDiscount = discountRate === "" ? 0 : Number(discountRate);
    const parsedTax = taxRate === "" ? 0 : Number(taxRate);
    // Line-item invoices validate the items; the amount is their
    // subtotal. Single-amount invoices validate as before.
    let parsedAmount: number;
    if (useItems) {
      const itemsError = validateInvoiceItems(items);
      if (itemsError) {
        setErrors({ form: itemsError });
        return;
      }
      parsedAmount = computeItemsSubtotal(items);
    } else {
      parsedAmount = Number(amount);
    }
    const errs = validateInvoice({ amount: parsedAmount, clientId, description, discountRate: parsedDiscount, dueDate, taxRate: parsedTax });
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;
    if (saving) return;
    setSaving(true);
    const res = await fetch("/api/invoices", {
      body: JSON.stringify({
        amount: Math.round(parsedAmount * 100) / 100,
        clientId,
        description: description.trim(),
        discountRate: parsedDiscount,
        dueDate,
        items: useItems ? items : undefined,
        taxRate: parsedTax,
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
      const data = (await res.json().catch(() => null)) as { errors?: Record<string, string> } | null;
      setErrors(data?.errors ?? { form: "Could not save the invoice." });
      return;
    }
    const saved = (await res.json()) as Invoice;
    setInvoices((prev) => [...prev, saved]);
    setClientId(""); setDescription(""); setAmount(""); setUseItems(false);
    setItems([{ description: "", quantity: 1, unitPrice: 0 }]);
    setDiscountRate(""); setTaxRate(""); setDueDate(""); setErrors({});
    setSavedNote("Invoice added.");
  }

  async function togglePaid(inv: Invoice) {
    const res = await fetch(`/api/invoices/${inv.id}`, {
      body: JSON.stringify({ paid: inv.status !== "paid" }),
      headers: { "Content-Type": "application/json" },
      method: "PUT",
    });
    if (res.status === 401) {
      window.location.href = "/login";
      return;
    }
    if (res.ok) {
      const saved = (await res.json()) as Invoice;
      setInvoices((prev) => prev.map((i) => (i.id === saved.id ? saved : i)));
    }
  }

  async function deleteOne(id: string) {
    const res = await fetch(`/api/invoices/${id}`, { method: "DELETE" });
    if (res.status === 401) {
      window.location.href = "/login";
      return;
    }
    if (res.ok) setInvoices((prev) => prev.filter((i) => i.id !== id));
  }

  async function submitRecurring(e: React.FormEvent) {
    e.preventDefault();
    const parsedAmount = Number(rAmount);
    const parsedDiscount = rDiscount === "" ? 0 : Number(rDiscount);
    const parsedTax = rTax === "" ? 0 : Number(rTax);
    const errs = validateInvoice({ amount: parsedAmount, clientId: rClientId, description: rDescription, discountRate: parsedDiscount, dueDate: rNextDue, taxRate: parsedTax });
    setRErrors(errs);
    if (Object.keys(errs).length > 0) return;
    const res = await fetch("/api/recurring", {
      body: JSON.stringify({
        amount: Math.round(parsedAmount * 100) / 100,
        clientId: rClientId,
        description: rDescription.trim(),
        discountRate: parsedDiscount,
        nextDueDate: rNextDue,
        taxRate: parsedTax,
      }),
      headers: { "Content-Type": "application/json" },
      method: "POST",
    });
    if (res.status === 401) {
      window.location.href = "/login";
      return;
    }
    if (!res.ok) {
      const data = (await res.json().catch(() => null)) as { errors?: Record<string, string> } | null;
      setRErrors(data?.errors ?? { form: "Could not save the recurring invoice." });
      return;
    }
    const saved = (await res.json()) as RecurringTemplate;
    setRecurring((prev) => [...prev, saved]);
    setRClientId(""); setRDescription(""); setRAmount(""); setRDiscount(""); setRTax(""); setRNextDue(""); setRErrors({});
    setRNote("Recurring invoice added. It generates one invoice when its due date arrives.");
  }

  async function stopRecurring(id: string) {
    const res = await fetch(`/api/recurring/${id}`, { method: "DELETE" });
    if (res.status === 401) {
      window.location.href = "/login";
      return;
    }
    if (res.ok) setRecurring((prev) => prev.filter((t) => t.id !== id));
  }

  async function generateDue() {
    if (generating) return;
    setGenerating(true);
    const res = await fetch("/api/recurring/generate", { method: "POST" });
    setGenerating(false);
    if (res.status === 401) {
      window.location.href = "/login";
      return;
    }
    if (!res.ok) {
      const data = (await res.json().catch(() => null)) as { errors?: { form?: string } } | null;
      setRNote(data?.errors?.form ?? "Could not generate due invoices.");
      return;
    }
    const data = (await res.json()) as { created: number };
    if (data.created > 0) {
      const [invRes, recRes] = await Promise.all([fetch("/api/invoices"), fetch("/api/recurring")]);
      if (invRes.ok) setInvoices((await invRes.json()) as Invoice[]);
      if (recRes.ok) setRecurring((await recRes.json()) as RecurringTemplate[]);
    }
    setRNote(data.created === 0 ? "Nothing due today." : `Generated ${data.created} invoice${data.created === 1 ? "" : "s"}.`);
  }

  async function generateOne(id: string) {
    if (generatingId) return;
    setGeneratingId(id);
    const res = await fetch(`/api/recurring/${id}/generate`, { method: "POST" });
    setGeneratingId(null);
    if (res.status === 401) {
      window.location.href = "/login";
      return;
    }
    if (!res.ok) {
      const data = (await res.json().catch(() => null)) as { errors?: { form?: string } } | null;
      setRNote(data?.errors?.form ?? "Could not generate that invoice.");
      return;
    }
    const [invRes, recRes] = await Promise.all([fetch("/api/invoices"), fetch("/api/recurring")]);
    if (invRes.ok) setInvoices((await invRes.json()) as Invoice[]);
    if (recRes.ok) setRecurring((await recRes.json()) as RecurringTemplate[]);
    setRNote("Invoice generated from the template.");
  }

  function openPay(inv: Invoice) {
    setPayForId(inv.id);
    setPayAmount(String(remaining.get(inv.id) ?? computeRemainingBalance(inv, payments.filter((p) => p.invoiceId === inv.id))));
    setPayDate(today);
    setPayMethod("");
    setPayReference("");
    setPayError("");
  }

  async function submitPay(e: React.FormEvent, inv: Invoice) {
    e.preventDefault();
    if (paySaving) return;
    setPaySaving(true);
    setPayError("");
    const res = await fetch(`/api/invoices/${inv.id}/payments`, {
      body: JSON.stringify({
        amount: Number(payAmount),
        idempotencyKey: newIdempotencyKey(),
        method: payMethod.trim() || undefined,
        paidAt: payDate || undefined,
        reference: payReference.trim() || undefined,
      }),
      headers: { "Content-Type": "application/json" },
      method: "POST",
    });
    setPaySaving(false);
    if (res.status === 401) {
      window.location.href = "/login";
      return;
    }
    if (!res.ok) {
      const data = (await res.json().catch(() => null)) as { errors?: Record<string, string>; error?: string } | null;
      setPayError(data?.errors?.amount ?? data?.errors?.paidAt ?? data?.errors?.form ?? data?.error ?? "Could not record the payment.");
      return;
    }
    const saved = (await res.json()) as Payment;
    setPayments((prev) => [...prev, saved]);
    // The server flips the invoice to paid when the balance hits
    // zero; mirror that here so the row updates without a reload.
    const paidSoFar = computeAmountPaid(payments.filter((p) => p.invoiceId === inv.id)) + saved.amount;
    if (paidSoFar >= computeInvoiceTotal(inv) - 0.001) {
      setInvoices((prev) => prev.map((i) => (i.id === inv.id ? { ...i, status: "paid" } : i)));
    }
    setPayForId(null);
    setSavedNote(`Payment of ${formatMoney(saved.amount)} recorded for ${formatInvoiceNumber(inv.number)}.`);
  }

  function exportCsv() {
    const csv = invoicesToCsv(filtered, clients, today, payments);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "clientdesk-invoices.csv";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  return (
    <Reveal>
      <div className="page-head">
        <h1>Invoices</h1>
        <p className="lead">Overdue means unpaid and past its due date. Paid invoices are never overdue.</p>
      </div>

      {activeClients.length === 0 ? (
        <EmptyState
          actionHref="/clients"
          actionLabel="Go to Clients"
          icon={<Users aria-hidden="true" size={22} />}
          text="Invoices need a client first."
          title="Add a client first"
        />
      ) : (
        <form className="card glass grid" data-reveal onSubmit={submit}>
          <h2 className="full" style={{ margin: 0 }}>Add invoice</h2>
          <p className="hint full" style={{ margin: 0 }}>Have the details as free text instead? <Link href="/invoices/draft">Draft an invoice from text</Link> — the draft stays editable until you create it.</p>
          <label className="full">Client *
            <select value={clientId} onChange={(e) => setClientId(e.target.value)}>
              <option value="">Choose a client</option>
              {activeClients.map((c) => <option key={c.id} value={c.id}>{c.name}{c.company ? ` — ${c.company}` : ""}</option>)}
            </select>
            {errors.clientId && <span className="error">{errors.clientId}</span>}
          </label>
          <label className="full">Description *
            <input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Website redesign" />
            {errors.description && <span className="error">{errors.description}</span>}
          </label>
          {!useItems && (
            <label>Amount ($) *
              <input type="number" min="0" step="0.01" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="450.00" />
              {errors.amount && <span className="error">{errors.amount}</span>}
            </label>
          )}
          <label className="full">
            <input type="checkbox" checked={useItems} onChange={(e) => setUseItems(e.target.checked)} /> Use line items instead of a single amount
          </label>
          {useItems && <InvoiceItemsEditor items={items} onChange={setItems} />}
          <label>Discount (%) — optional
            <input type="number" min="0" max="100" step="0.01" inputMode="decimal" value={discountRate} onChange={(e) => setDiscountRate(e.target.value)} placeholder="0" />
            {errors.discountRate && <span className="error">{errors.discountRate}</span>}
          </label>
          <label>Tax (%) — optional
            <input type="number" min="0" max="100" step="0.01" inputMode="decimal" value={taxRate} onChange={(e) => setTaxRate(e.target.value)} placeholder="0" />
            {errors.taxRate && <span className="error">{errors.taxRate}</span>}
          </label>
          <label>Due date *
            <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
            {errors.dueDate && <span className="error">{errors.dueDate}</span>}
          </label>
          {errors.form && <p className="error full" role="alert">{errors.form}</p>}
          <div className="actions full">
            <button className="primary" disabled={saving} type="submit">{saving ? "Saving…" : "Add invoice"}</button>
            {savedNote && <span className="hint" role="status">{savedNote}</span>}
          </div>
        </form>
      )}

      <div className="card glass" data-reveal>
        <h2 style={{ marginTop: 0 }}>Recurring invoices</h2>
        <p className="hint" style={{ marginTop: 0 }}>
          A monthly retainer: one invoice is generated when its due date arrives, then the
          next due date moves one month on. Nothing is generated automatically in the
          background — press “Generate due now” for everything due, or “Generate now”
          on one template to make its invoice early.
        </p>
        <form className="grid" onSubmit={submitRecurring}>
          <label className="full">Client *
            <select value={rClientId} onChange={(e) => setRClientId(e.target.value)}>
              <option value="">Choose a client</option>
              {activeClients.map((c) => <option key={c.id} value={c.id}>{c.name}{c.company ? ` — ${c.company}` : ""}</option>)}
            </select>
            {rErrors.clientId && <span className="error">{rErrors.clientId}</span>}
          </label>
          <label className="full">Description *
            <input value={rDescription} onChange={(e) => setRDescription(e.target.value)} placeholder="Monthly maintenance" />
            {rErrors.description && <span className="error">{rErrors.description}</span>}
          </label>
          <label>Amount ($) *
            <input type="number" min="0" step="0.01" inputMode="decimal" value={rAmount} onChange={(e) => setRAmount(e.target.value)} placeholder="600.00" />
            {rErrors.amount && <span className="error">{rErrors.amount}</span>}
          </label>
          <label>First due date *
            <input type="date" value={rNextDue} onChange={(e) => setRNextDue(e.target.value)} />
            {rErrors.dueDate && <span className="error">{rErrors.dueDate}</span>}
          </label>
          <label>Discount (%) — optional
            <input type="number" min="0" max="100" step="0.01" inputMode="decimal" value={rDiscount} onChange={(e) => setRDiscount(e.target.value)} placeholder="0" />
            {rErrors.discountRate && <span className="error">{rErrors.discountRate}</span>}
          </label>
          <label>Tax (%) — optional
            <input type="number" min="0" max="100" step="0.01" inputMode="decimal" value={rTax} onChange={(e) => setRTax(e.target.value)} placeholder="0" />
            {rErrors.taxRate && <span className="error">{rErrors.taxRate}</span>}
          </label>
          {rErrors.form && <p className="error full" role="alert">{rErrors.form}</p>}
          <div className="actions full">
            <button className="primary" type="submit">Add recurring invoice</button>
            {rNote && <span className="hint" role="status">{rNote}</span>}
          </div>
        </form>
        {recurring.length > 0 && (
          <div style={{ marginTop: 16 }}>
            <div className="table-wrap">
              <table>
                <thead><tr><th>Description</th><th>Client</th><th>Amount</th><th>Next due</th><th>Actions</th></tr></thead>
                <tbody>
                  {recurring.map((t) => {
                    const due = recurringDueLabel(t.nextDueDate, today);
                    return (
                      <tr key={t.id}>
                        <td data-label="Description">{t.description}</td>
                        <td data-label="Client">{byId.get(t.clientId)?.name ?? "Unknown client"}</td>
                        <td className="num" data-label="Amount">{formatMoney(computeInvoiceTotal({ ...t, dueDate: t.nextDueDate, id: t.id, issuedDate: today, number: null, status: "unpaid" }))}</td>
                        <td data-label="Next due">
                          {t.nextDueDate}{" "}
                          {due.tone === "ok" ? (
                            <span className="hint">{due.text}</span>
                          ) : (
                            <span className={`badge ${due.tone === "due" ? "badge-overdue" : "badge-unpaid"} badge-glow`}>{due.text}</span>
                          )}
                        </td>
                        <td data-label="Actions">
                          <div className="actions">
                            <button disabled={generatingId === t.id} onClick={() => generateOne(t.id)} type="button">
                              {generatingId === t.id ? "Generating…" : "Generate now"}
                            </button>
                            <button onClick={() => stopRecurring(t.id)} type="button">Stop</button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="actions" style={{ marginTop: 12 }}>
              <button disabled={generating} onClick={generateDue} type="button">{generating ? "Generating…" : "Generate due now"}</button>
            </div>
          </div>
        )}
      </div>

      <div className="toolbar">
        <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search description or client…" aria-label="Search invoices" />
        <select value={filter} onChange={(e) => setFilter(e.target.value as InvoiceFilter)} aria-label="Filter by status">
          <option value="all">All statuses</option>
          <option value="paid">Paid</option>
          <option value="unpaid">Unpaid</option>
          <option value="overdue">Overdue</option>
        </select>
        <select value={sort} onChange={(e) => setSort(e.target.value as SortKey)} aria-label="Sort invoices">
          <option value="due-asc">Due date, soonest first</option>
          <option value="issued-desc">Issued, newest first</option>
          <option value="amount-desc">Amount, highest first</option>
        </select>
        <label>Due from
          <input type="date" value={dueFrom} onChange={(e) => setDueFrom(e.target.value)} aria-label="Due from" />
        </label>
        <label>Due to
          <input type="date" value={dueTo} onChange={(e) => setDueTo(e.target.value)} aria-label="Due to" />
        </label>
        <button onClick={() => { setDueFrom(""); setDueTo(""); }} disabled={!dueFrom && !dueTo}>Clear dates</button>
        <button onClick={exportCsv} disabled={filtered.length === 0}>Export CSV</button>
        <button onClick={() => window.print()}>Print</button>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={<Search aria-hidden="true" size={22} />}
          text="Try a different search, filter, or sort — or add an invoice above."
          title="No invoices match this view"
        />
      ) : (
        <div className="card table-wrap" data-reveal>
          <table>
            <thead><tr><th>Number</th><th>Client</th><th>Description</th><th>Items</th><th>Amount</th><th>Total</th><th>Status</th><th>Issued</th><th>Due</th><th>Actions</th></tr></thead>
            <tbody>
              {paged.map((inv) => {
                const overdue = isOverdue(inv, today);
                const balance = remaining.get(inv.id) ?? 0;
                return (
                  <Fragment key={inv.id}>
                    <tr>
                      <td data-label="Number">{formatInvoiceNumber(inv.number)}</td>
                      <td data-label="Client">{byId.get(inv.clientId)?.name ?? "Unknown client"}</td>
                      <td data-label="Description">{inv.description}</td>
                      <td data-label="Items">{inv.items && inv.items.length > 0 ? `${inv.items.length} item${inv.items.length === 1 ? "" : "s"}` : "—"}</td>
                      <td className="num" data-label="Amount">{formatMoney(inv.amount)}</td>
                      <td className="num" data-label="Total">{formatMoney(computeInvoiceTotal(inv))}</td>
                      <td data-label="Status">
                        <StatusBadge status={overdue ? "overdue" : inv.status} />
                      </td>
                      <td data-label="Issued">{inv.issuedDate}</td>
                      <td data-label="Due">{inv.dueDate}</td>
                      <td data-label="Actions">
                        <div className="actions">
                          <Link className="btn" href={`/invoices/${inv.id}`}>View</Link>
                          {balance > 0 && (
                            <button onClick={() => (payForId === inv.id ? setPayForId(null) : openPay(inv))} type="button">
                              {payForId === inv.id ? "Close" : "Record payment"}
                            </button>
                          )}
                          {overdue && balance > 0 && (
                            <button onClick={() => setRemindForId(remindForId === inv.id ? null : inv.id)} type="button">
                              {remindForId === inv.id ? "Close reminder" : "Draft reminder"}
                            </button>
                          )}
                          <button onClick={() => togglePaid(inv)}>
                            {inv.status === "paid" ? "Mark unpaid" : "Mark paid"}
                          </button>
                          {confirmDeleteId === inv.id ? (
                            <>
                              <button className="danger" onClick={() => deleteOne(inv.id)}>Confirm delete</button>
                              <button onClick={() => setConfirmDeleteId(null)}>Cancel</button>
                            </>
                          ) : (
                            <button className="danger" onClick={() => deleteOne(inv.id)}>Delete</button>
                          )}
                        </div>
                      </td>
                    </tr>
                    {payForId === inv.id && (
                      <tr key={`${inv.id}-pay`}>
                        <td colSpan={10}>
                          <form className="grid" onSubmit={(e) => submitPay(e, inv)}>
                            <p className="hint full" style={{ margin: 0 }}>
                              Recording a payment for {formatInvoiceNumber(inv.number)} — {formatMoney(balance)} still owed.
                            </p>
                            <label>Amount ($) *
                              <input type="number" min="0" step="0.01" inputMode="decimal" value={payAmount} onChange={(e) => setPayAmount(e.target.value)} />
                            </label>
                            <label>Paid on
                              <input type="date" value={payDate} onChange={(e) => setPayDate(e.target.value)} />
                            </label>
                            <label>Method — optional
                              <input value={payMethod} onChange={(e) => setPayMethod(e.target.value)} placeholder="Bank transfer" />
                            </label>
                            <label>Reference — optional
                              <input value={payReference} onChange={(e) => setPayReference(e.target.value)} placeholder="INV-123" />
                            </label>
                            {payError && <p className="error full" role="alert">{payError}</p>}
                            <div className="actions full">
                              <button className="primary" disabled={paySaving} type="submit">{paySaving ? "Saving…" : "Record payment"}</button>
                              <button onClick={() => setPayForId(null)} type="button">Cancel</button>
                            </div>
                          </form>
                        </td>
                      </tr>
                    )}
                    {remindForId === inv.id && (
                      <tr key={`${inv.id}-remind`}>
                        <td colSpan={10}>
                          <ReminderDraft
                            balance={balance}
                            clientName={byId.get(inv.clientId)?.name ?? "Unknown client"}
                            dueDate={inv.dueDate}
                            invoiceNumber={formatInvoiceNumber(inv.number)}
                            paid={computeAmountPaid(payments.filter((p) => p.invoiceId === inv.id))}
                            today={today}
                            total={computeInvoiceTotal(inv)}
                          />
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
          <Pagination label="invoices" onPage={setPage} page={displayPage} total={filtered.length} />
        </div>
      )}
    </Reveal>
  );
}
