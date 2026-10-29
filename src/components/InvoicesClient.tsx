"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import Reveal from "./Reveal";
import { invoicesToCsv } from "../lib/csv";
import { filterInvoices, formatMoney, isOverdue, todayIso } from "../lib/invoices";
import type { Client, Invoice, InvoiceFilter } from "../lib/types";
import { validateInvoice } from "../lib/validation";

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
  const [clientId, setClientId] = useState("");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const today = todayIso();
  const filtered = useMemo(
    () => filterInvoices(invoices, clients, query, filter, today),
    [invoices, clients, query, filter, today],
  );
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
      <h1>Invoices</h1>
      <p className="lead">Overdue means unpaid and past its due date. Paid invoices are never overdue.</p>

      {clients.length === 0 ? (
        <p className="card">Add a client first: <Link href="/clients">Go to Clients →</Link></p>
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
          <div className="actions full"><button className="primary" disabled={saving} type="submit">{saving ? "Saving…" : "Add invoice"}</button></div>
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
        <button onClick={exportCsv} disabled={filtered.length === 0}>Export CSV</button>
        <button onClick={() => window.print()}>Print</button>
      </div>

      {filtered.length === 0 ? (
        <p>No invoices match this search / filter.</p>
      ) : (
        <div className="card table-wrap" data-reveal>
          <table>
            <thead><tr><th>Client</th><th>Description</th><th>Amount</th><th>Status</th><th>Issued</th><th>Due</th><th>Actions</th></tr></thead>
            <tbody>
              {filtered.map((inv) => {
                const overdue = isOverdue(inv, today);
                return (
                  <tr key={inv.id}>
                    <td>{byId.get(inv.clientId)?.name ?? "Unknown client"}</td>
                    <td>{inv.description}</td>
                    <td>{formatMoney(inv.amount)}</td>
                    <td>{overdue ? <span className="badge badge-overdue">Overdue</span> : inv.status === "paid" ? <span className="badge badge-paid">Paid</span> : <span className="badge badge-unpaid">Unpaid</span>}</td>
                    <td>{inv.issuedDate}</td>
                    <td>{inv.dueDate}</td>
                    <td>
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
                          <button className="danger" onClick={() => setConfirmDeleteId(inv.id)}>Delete</button>
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
