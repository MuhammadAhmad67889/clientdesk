"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import Reveal from "./Reveal";
import { EmptyState, StatusBadge } from "./ui";
import { computeTotals, formatMoney, isOverdue, sortInvoicesRecent, todayIso } from "../lib/invoices";
import type { Client, Invoice } from "../lib/types";

export default function DashboardClient({
  initialClients,
  initialInvoices,
}: {
  initialClients: Client[];
  initialInvoices: Invoice[];
}) {
  const [clients, setClients] = useState(initialClients);
  const [invoices, setInvoices] = useState(initialInvoices);
  const [email, setEmail] = useState<string | null>(null);
  const [resetDone, setResetDone] = useState(false);
  const [resetting, setResetting] = useState(false);

  useEffect(() => {
    fetch("/api/me")
      .then((r) => (r.ok ? r.json() : null))
      .then((d: { email?: string } | null) => setEmail(d?.email ?? null))
      .catch(() => setEmail(null));
  }, []);

  async function refresh() {
    const [cRes, iRes] = await Promise.all([fetch("/api/clients"), fetch("/api/invoices")]);
    if (cRes.status === 401 || iRes.status === 401) {
      window.location.href = "/login";
      return;
    }
    setClients(await cRes.json());
    setInvoices(await iRes.json());
  }

  const today = todayIso();
  const totals = computeTotals(invoices, clients, today);
  const byId = new Map(clients.map((c) => [c.id, c]));
  const recent = sortInvoicesRecent(invoices).slice(0, 5);
  const overdue = invoices
    .filter((inv) => isOverdue(inv, today))
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate))
    .slice(0, 5);
  const unpaidCount = invoices.filter((i) => i.status === "unpaid").length;
  const recentClients = [...clients]
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, 5);

  async function resetDemo() {
    if (!window.confirm("Reset to the demo clients and invoices? Your changes will be lost.")) return;
    setResetting(true);
    const res = await fetch("/api/reset-demo", { method: "POST" });
    setResetting(false);
    if (res.status === 401) {
      window.location.href = "/login";
      return;
    }
    if (res.ok) {
      await refresh();
      setResetDone(true);
    }
  }

  return (
    <Reveal>
      <div className="page-head">
        <h1>{email ? `Welcome back` : "Overview"}</h1>
        <p className="lead">
          {email
            ? `Signed in as ${email}. Here is what is happening in your business, and what needs your attention.`
            : "Here is what is happening in your business, and what needs your attention."}
        </p>
        <div className="page-actions">
          <Link className="btn btn-primary" href="/clients">Add client</Link>
          <Link className="btn" href="/invoices">Add invoice</Link>
        </div>
      </div>

      <div className="stats">
        <div className="stat" data-reveal><span>Total outstanding</span><strong>{formatMoney(totals.totalOutstanding)}</strong><small>{unpaidCount} unpaid invoice{unpaidCount === 1 ? "" : "s"}</small></div>
        <div className="stat" data-reveal><span>Total paid</span><strong>{formatMoney(totals.totalPaid)}</strong></div>
        <div className="stat" data-reveal><span>Overdue</span><strong>{totals.overdueCount} · {formatMoney(totals.overdueAmount)}</strong><small>Unpaid and past due</small></div>
        <div className="stat" data-reveal><span>Clients</span><strong>{totals.clientCount}</strong></div>
        <div className="stat" data-reveal><span>Invoices</span><strong>{totals.invoiceCount}</strong></div>
      </div>

      <div className="two-col">
        <div className="card" data-reveal>
          <div className="card-head">
            <h2>Needs your attention</h2>
            <p>{overdue.length === 0 ? "Nothing overdue" : `${overdue.length} overdue`}</p>
          </div>
          {overdue.length === 0 ? (
            <p className="hint">No overdue invoices. Unpaid invoices appear here once they pass their due date.</p>
          ) : (
            <ul className="attention-list">
              {overdue.map((inv) => (
                <li key={inv.id}>
                  <span>
                    <Link href="/invoices">{inv.description}</Link> — {byId.get(inv.clientId)?.name ?? "Unknown client"}
                  </span>
                  <span><strong>{formatMoney(inv.amount)}</strong> · due {inv.dueDate}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="card" data-reveal>
          <div className="card-head">
            <h2>Recent clients</h2>
            <Link href="/clients">View all →</Link>
          </div>
          {recentClients.length === 0 ? (
            <p className="hint">No clients yet.</p>
          ) : (
            <ul className="attention-list">
              {recentClients.map((c) => (
                <li key={c.id}>
                  <Link href="/clients">{c.name}</Link>
                  <span>{c.company ?? c.email ?? "—"}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="card" data-reveal>
        <div className="card-head">
          <h2>Recent invoices</h2>
          <Link href="/invoices">View all →</Link>
        </div>
        {recent.length === 0 ? (
          <EmptyState
            actionHref="/invoices"
            actionLabel="Add your first invoice"
            text="Invoices you create will show up here, newest first."
            title="No invoices yet"
          />
        ) : (
          <div className="table-wrap">
            <table>
              <thead><tr><th>Client</th><th>Description</th><th>Amount</th><th>Status</th><th>Due</th></tr></thead>
              <tbody>
                {recent.map((inv) => (
                  <tr key={inv.id}>
                    <td data-label="Client">{byId.get(inv.clientId)?.name ?? "Unknown client"}</td>
                    <td data-label="Description">{inv.description}</td>
                    <td data-label="Amount">{formatMoney(inv.amount)}</td>
                    <td data-label="Status">
                      <StatusBadge status={isOverdue(inv, today) ? "overdue" : inv.status} />
                    </td>
                    <td data-label="Due">{inv.dueDate}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="card no-print" data-reveal>
        <h2>Demo data</h2>
        <p className="hint">Demo data was added when your account was created. Resetting restores it and removes your changes.</p>
        <div className="actions">
          <button disabled={resetting} onClick={resetDemo} type="button">
            {resetting ? "Resetting…" : "Reset demo data"}
          </button>
          {resetDone && <span className="hint" role="status">Demo data restored.</span>}
        </div>
      </div>
      <p className="footer-note">Data is stored in the server database, scoped to your account.</p>
    </Reveal>
  );
}
