"use client";

import { useMemo, useState } from "react";
import Reveal from "./Reveal";
import { EmptyState, StatusBadge } from "./ui";
import { invoicesToCsv } from "../lib/csv";
import { filterInvoices, formatMoney, isOverdue, todayIso } from "../lib/invoices";
import type { Client, Invoice, InvoiceFilter } from "../lib/types";
import { validateInvoice } from "../lib/validation";

type SortKey = "due-asc" | "issued-desc" | "amount-desc";

export default function InvoicesClient({
  initialClients,
  initialInvoices,
}: {
  initialClients: Client[];
  initialInvoices: Invoice[];
}) {
  const [clients] = useState(initialClients);
  const [invoices, setInvoices] = useState(initialInvoices);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<InvoiceFilter>("all");
  const [sort, setSort] = useState<SortKey>("due-asc");
  const [clientId, setClientId] = useState("");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [savedNote, setSavedNote] = useState("");

  const today = todayIso();
  const filtered = useMemo(() => {
    const list = filterInvoices(invoices, clients, query, filter, today);
    const sorted = [...list];
    if (sort === "amount-desc") sorted.sort((a, b) => b.amount - a.amount);
    else if (sort === "issued-desc") sorted.sort((a, b) => b.issuedDate.localeCompare(a.issuedDate));
    else sorted.sort((a, b) => a.dueDate.localeCompare(b.dueDate));
    return sorted;
  }, [invoices, clients, query, filter, sort, today]);
  const byId = useMemo(() => new Map(clients.map((c) => [c.id, c])), [clients]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const parsedAmount = Number(amount);
    const errs = validateInvoice({ amount: parsedAmount, clientId, description, dueDate });
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;
    if (saving) return;
    setSaving(true);
    const res = await fetch("/api/invoices", {
      body: JSON.stringify({
        amount: Math.round(parsedAmount * 100) / 100,
        clientId,
        description: description.trim(),
        dueDate,
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
    setClientId(""); setDescription(""); setAmount(""); setDueDate(""); setErrors({});
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

  function exportCsv() {
    const csv = invoicesToCsv(filtered, clients, today);
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

      {clients.length === 0 ? (
        <EmptyState
          actionHref="/clients"
          actionLabel="Go to Clients"
          text="Invoices need a client first."
          title="Add a client first"
        />
      ) : (
        <form className="card grid" data-reveal onSubmit={submit}>
          <h2 className="full" style={{ margin: 0 }}>Add invoice</h2>
          <label className="full">Client *
            <select value={clientId} onChange={(e) => setClientId(e.target.value)}>
              <option value="">Choose a client</option>
              {clients.map((c) => <option key={c.id} value={c.id}>{c.name}{c.company ? ` — ${c.company}` : ""}</option>)}
            </select>
            {errors.clientId && <span className="error">{errors.clientId}</span>}
          </label>
          <label className="full">Description *
            <input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Website redesign" />
            {errors.description && <span className="error">{errors.description}</span>}
          </label>
          <label>Amount ($) *
            <input type="number" min="0" step="0.01" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="450.00" />
            {errors.amount && <span className="error">{errors.amount}</span>}
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
        <button onClick={exportCsv} disabled={filtered.length === 0}>Export CSV</button>
        <button onClick={() => window.print()}>Print</button>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          text="Try a different search, filter, or sort — or add an invoice above."
          title="No invoices match this view"
        />
      ) : (
        <div className="card table-wrap" data-reveal>
          <table>
            <thead><tr><th>Client</th><th>Description</th><th>Amount</th><th>Status</th><th>Issued</th><th>Due</th><th>Actions</th></tr></thead>
            <tbody>
              {filtered.map((inv) => {
                const overdue = isOverdue(inv, today);
                return (
                  <tr key={inv.id}>
                    <td data-label="Client">{byId.get(inv.clientId)?.name ?? "Unknown client"}</td>
                    <td data-label="Description">{inv.description}</td>
                    <td data-label="Amount">{formatMoney(inv.amount)}</td>
                    <td data-label="Status">
                      <StatusBadge status={overdue ? "overdue" : inv.status} />
                    </td>
                    <td data-label="Issued">{inv.issuedDate}</td>
                    <td data-label="Due">{inv.dueDate}</td>
                    <td data-label="Actions">
                      <div className="actions">
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
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </Reveal>
  );
}
