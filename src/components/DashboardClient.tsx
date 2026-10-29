"use client";

import Link from "next/link";
import { useState } from "react";
import Reveal from "./Reveal";
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
  const [resetDone, setResetDone] = useState(false);

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

  return (
    <Reveal>
      <h1>Dashboard</h1>
      <p className="lead">
        Your clients and invoices are private to your account. Demo data was added when
        your account was created — use “Reset demo data” to restore it.
      </p>
      <div className="stats">
        <div className="stat" data-reveal><span>Total outstanding</span><strong>{formatMoney(totals.totalOutstanding)}</strong></div>
        <div className="stat" data-reveal><span>Total paid</span><strong>{formatMoney(totals.totalPaid)}</strong></div>
        <div className="stat" data-reveal><span>Overdue</span><strong>{totals.overdueCount} · {formatMoney(totals.overdueAmount)}</strong></div>
        <div className="stat" data-reveal><span>Clients</span><strong>{totals.clientCount}</strong></div>
        <div className="stat" data-reveal><span>Invoices</span><strong>{totals.invoiceCount}</strong></div>
      </div>
      <div className="card" data-reveal>
        <h2>Recent invoices</h2>
        {recent.length === 0 ? (
          <p>No invoices yet. <Link href="/invoices">Add your first invoice</Link>.</p>
        ) : (
          <div className="table-wrap">
            <table>
              <thead><tr><th>Client</th><th>Description</th><th>Amount</th><th>Status</th><th>Due</th></tr></thead>
              <tbody>
                {recent.map((inv) => (
                  <tr key={inv.id}>
                    <td>{byId.get(inv.clientId)?.name ?? "Unknown client"}</td>
                    <td>{inv.description}</td>
                    <td>{formatMoney(inv.amount)}</td>
                    <td>
                      {isOverdue(inv, today) ? <span className="badge badge-overdue">Overdue</span>
                        : inv.status === "paid" ? <span className="badge badge-paid">Paid</span>
                        : <span className="badge badge-unpaid">Unpaid</span>}
                    </td>
                    <td>{inv.dueDate}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <p><Link href="/invoices">View all invoices →</Link> · <Link href="/clients">Manage clients →</Link></p>
      </div>
      <div className="toolbar no-print">
        <button
          onClick={async () => {
            if (window.confirm("Reset to the demo clients and invoices? Your changes will be lost.")) {
              const res = await fetch("/api/reset-demo", { method: "POST" });
              if (res.status === 401) window.location.href = "/login";
              else {
                await refresh();
                setResetDone(true);
              }
            }
          }}
        >
          Reset demo data
        </button>
        {resetDone && <span className="hint">Demo data restored.</span>}
      </div>
      <p className="footer-note">Data is stored in the server database, scoped to your account.</p>
    </Reveal>
  );
}
