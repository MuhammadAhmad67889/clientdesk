"use client";

import Link from "next/link";
import { useState } from "react";
import { computeTotals, formatMoney, isOverdue, sortInvoicesRecent, todayIso } from "../lib/invoices";
import { useStore } from "../lib/useStore";

export default function DashboardPage() {
  const { data, loaded, resetDemo } = useStore();
  const [resetDone, setResetDone] = useState(false);
  if (!loaded || !data) return <p>Loading…</p>;

  const today = todayIso();
  const totals = computeTotals(data.invoices, data.clients, today);
  const byId = new Map(data.clients.map((c) => [c.id, c]));
  const recent = sortInvoicesRecent(data.invoices).slice(0, 5);

  return (
    <>
      <h1>Dashboard</h1>
      <p className="lead">
        Demo data is stored only in your browser (localStorage). Use “Reset demo data” to restore
        the labelled seed clients and invoices.
      </p>
      <div className="stats">
        <div className="stat"><span>Total outstanding</span><strong>{formatMoney(totals.totalOutstanding)}</strong></div>
        <div className="stat"><span>Total paid</span><strong>{formatMoney(totals.totalPaid)}</strong></div>
        <div className="stat"><span>Overdue</span><strong>{totals.overdueCount} · {formatMoney(totals.overdueAmount)}</strong></div>
        <div className="stat"><span>Clients</span><strong>{totals.clientCount}</strong></div>
        <div className="stat"><span>Invoices</span><strong>{totals.invoiceCount}</strong></div>
      </div>
      <div className="card">
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
          onClick={() => {
            if (window.confirm("Reset to the demo clients and invoices? Your changes will be lost.")) {
              resetDemo();
              setResetDone(true);
            }
          }}
        >
          Reset demo data
        </button>
        {resetDone && <span className="hint">Demo data restored.</span>}
      </div>
      <p className="footer-note">Single-user demo in v1: no sign-in, no server database, no data leaves your browser.</p>
    </>
  );
}
