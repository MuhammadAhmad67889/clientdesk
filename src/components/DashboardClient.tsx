"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { useEffect, useState } from "react";
import DeltaChip from "./DeltaChip";
import OnboardingCard from "./OnboardingCard";
import Reveal from "./Reveal";
import { ConfirmDialog } from "./Dialog";
import { EmptyState, StatusBadge } from "./ui";
import { computeClientTotals, computeInvoiceTotal, computeRemainingBalance, formatInvoiceNumber, formatMoney, isOverdue, sortInvoicesRecent, todayIso } from "../lib/invoices";
import { computeMonthlyOverview } from "../lib/monthly";
import { buildActivity } from "../lib/activity";
import { rankClientsByOutstanding, summarizeMonth } from "../lib/drafts";
import { deltaVsPrevious, monthKey, previousMonthKey, sumPaidByMonth } from "../lib/analytics";
import type { Client, Invoice, Payment } from "../lib/types";

/** First day included by a "last N days" filter, from a YYYY-MM-DD date. */
function cutoffFor(today: string, days: number): string {
  const d = new Date(`${today}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() - (days - 1));
  return d.toISOString().slice(0, 10);
}

export default function DashboardClient({
  initialClients,
  initialInvoices,
  initialPayments,
}: {
  initialClients: Client[];
  initialInvoices: Invoice[];
  initialPayments: Payment[];
}) {
  const [clients, setClients] = useState(initialClients);
  const [invoices, setInvoices] = useState(initialInvoices);
  const [payments, setPayments] = useState(initialPayments);
  const [email, setEmail] = useState<string | null>(null);
  const [resetDone, setResetDone] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const [range, setRange] = useState<"all" | "30" | "90">("all");
  const [generating, setGenerating] = useState(false);
  const [generateNote, setGenerateNote] = useState("");

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
    // Demo reset reseeds clients and invoices with no payments.
    setPayments([]);
  }

  const today = todayIso();
  const totals = computeClientTotals(invoices, payments, today);
  const month = today.slice(0, 7);
  const monthSummary = summarizeMonth(invoices, payments, month, today);
  const rankedClients = rankClientsByOutstanding(clients, invoices, payments);
  const balanceByInvoice = new Map<string, number>(
    invoices.map((inv) => [inv.id, computeRemainingBalance(inv, payments.filter((p) => p.invoiceId === inv.id))]),
  );
  const byId = new Map(clients.map((c) => [c.id, c]));
  // The range filter covers the recent lists and the trend only.
  // Account totals above stay unfiltered, so they never mislead.
  const cutoff = range === "all" ? null : cutoffFor(today, Number(range));
  const rangeInvoices = cutoff ? invoices.filter((inv) => inv.issuedDate >= cutoff) : invoices;
  const rangeClients = cutoff ? clients.filter((c) => c.createdAt >= cutoff) : clients;
  const recent = sortInvoicesRecent(rangeInvoices).slice(0, 5);
  const overdue = invoices
    .filter((inv) => isOverdue(inv, today))
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate))
    .slice(0, 5);
  const unpaidCount = invoices.filter((i) => i.status === "unpaid").length;
  const recentClients = [...rangeClients]
    .filter((c) => !c.archived)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, 5);
  // Paid this month vs last month, from real payment rows only, so
  // the delta always matches the Total paid tile above it.
  const thisMonthKey = monthKey(today);
  const paidByMonth = sumPaidByMonth(payments);
  const paidDelta = deltaVsPrevious(
    paidByMonth.get(thisMonthKey) ?? 0,
    paidByMonth.get(previousMonthKey(thisMonthKey)) ?? 0,
  );
  // Pending invoices: unpaid balances, soonest due first. Overdue
  // invoices appear here too — this list is about money owed, not
  // just what is late.
  const pendingCount = invoices.filter(
    (inv) => (balanceByInvoice.get(inv.id) ?? computeInvoiceTotal(inv)) > 0,
  ).length;
  const pending = invoices
    .filter((inv) => (balanceByInvoice.get(inv.id) ?? computeInvoiceTotal(inv)) > 0)
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate))
    .slice(0, 5);
  const activity = buildActivity(clients, invoices, payments);
  // Revenue trend: two SVG lines from the real monthly totals —
  // paid and outstanding — with the exact figures listed below.
  const months = computeMonthlyOverview(rangeInvoices);
  const monthMax = Math.max(1, ...months.flatMap((m) => [m.paid, m.outstanding]));
  const chartW = 600;
  const chartH = 220;
  const chartTop = 16;
  const chartBottom = 28;
  const chartSide = 8;
  const chartX = (i: number) =>
    months.length === 1 ? chartW / 2 : chartSide + (i * (chartW - chartSide * 2)) / (months.length - 1);
  const chartY = (v: number) => chartTop + (1 - v / monthMax) * (chartH - chartTop - chartBottom);
  const chartPoints = (key: "paid" | "outstanding") =>
    months.map((m, i) => `${chartX(i)},${chartY(m[key])}`).join(" ");

  async function generateDue() {
    if (generating) return;
    setGenerating(true);
    setGenerateNote("");
    const res = await fetch("/api/recurring/generate", { method: "POST" });
    setGenerating(false);
    if (res.status === 401) {
      window.location.href = "/login";
      return;
    }
    const data = (await res.json().catch(() => null)) as { created?: number; errors?: Record<string, string> } | null;
    if (!res.ok) {
      setGenerateNote(data?.errors?.form ?? "Could not generate.");
      return;
    }
    // Refresh lists without touching payments — generating only
    // adds invoices, it never changes recorded payments.
    const [cRes, iRes] = await Promise.all([fetch("/api/clients"), fetch("/api/invoices")]);
    if (cRes.ok && iRes.ok) {
      setClients(await cRes.json());
      setInvoices(await iRes.json());
    }
    setGenerateNote(
      data?.created === 0
        ? "Nothing due right now."
        : `Generated ${data?.created ?? 0} invoice${data?.created === 1 ? "" : "s"}.`,
    );
  }

  async function resetDemo() {
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
          <Link className="btn" href="/invoices/draft">Draft from text</Link>
          <button disabled={generating} onClick={generateDue} type="button">
            {generating ? "Generating…" : "Generate due now"}
          </button>
        </div>
        {generateNote && <p className="hint" role="status">{generateNote}</p>}
      </div>

      <div className="toolbar" role="group" aria-label="Date range for recent lists and trend">
        <span>Recent lists and trend:</span>
        {(["all", "30", "90"] as const).map((r) => (
          <button key={r} aria-pressed={range === r} onClick={() => setRange(r)} type="button">
            {r === "all" ? "All time" : `Last ${r} days`}
          </button>
        ))}
      </div>

      <OnboardingCard
        clientCount={clients.length}
        invoiceCount={invoices.length}
        paymentCount={payments.length}
        paymentHref={invoices.find((i) => i.status === "unpaid") ? `/invoices/${invoices.find((i) => i.status === "unpaid")!.id}` : "/invoices"}
      />

      <div className="stats">
        <div className="stat" data-reveal><span>Total outstanding</span><strong>{formatMoney(totals.totalOutstanding)}</strong><small>{unpaidCount} unpaid invoice{unpaidCount === 1 ? "" : "s"}</small></div>
        <div className="stat" data-reveal>
          <span>Total paid</span><strong>{formatMoney(totals.totalPaid)}</strong>
          <DeltaChip delta={paidDelta} />
        </div>
        <div className="stat" data-reveal><span>Overdue</span><strong>{totals.overdueCount} · {formatMoney(totals.overdueAmount)}</strong><small>Unpaid and past due</small></div>
        <div className="stat" data-reveal><span>Clients</span><strong>{clients.length}</strong></div>
        <div className="stat" data-reveal><span>Invoices</span><strong>{invoices.length}</strong></div>
      </div>

      <div className="card" data-reveal>
        <div className="card-head">
          <h2>Revenue trend</h2>
          <p>By issued date · paid vs outstanding{range !== "all" ? ` · last ${range} days` : ""}</p>
        </div>
        <svg aria-label="Paid and outstanding totals by month" role="img" style={{ height: "auto", width: "100%" }} viewBox={`0 0 ${chartW} ${chartH}`}>
          <title>Paid and outstanding totals by month</title>
          <polyline fill="none" points={chartPoints("paid")} stroke="var(--success)" strokeWidth="2" />
          <polyline fill="none" points={chartPoints("outstanding")} stroke="var(--primary)" strokeWidth="2" />
          {months.map((m, i) => (
            <g key={m.key}>
              <circle cx={chartX(i)} cy={chartY(m.paid)} fill="var(--success)" r="4" />
              <circle cx={chartX(i)} cy={chartY(m.outstanding)} fill="var(--primary)" r="4" />
              <text fill="var(--text-2)" fontSize="12" textAnchor="middle" x={chartX(i)} y={chartH - 8}>{m.label}</text>
            </g>
          ))}
        </svg>
        <div style={{ display: "grid", gap: 6, marginTop: 8 }}>
          {months.map((m) => (
            <div key={m.key} style={{ display: "flex", justifyContent: "space-between", fontSize: "0.88rem" }}>
              <strong>{m.label}</strong>
              <span style={{ color: "var(--text-2)" }}>
                Paid {formatMoney(m.paid)} · Outstanding {formatMoney(m.outstanding)}
              </span>
            </div>
          ))}
        </div>
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
                  <span><strong>{formatMoney(balanceByInvoice.get(inv.id) ?? computeInvoiceTotal(inv))}</strong> · due {inv.dueDate}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="card" data-reveal>
          <div className="card-head">
            <h2>Recent clients</h2>
            <Link href="/clients">View all <ArrowRight aria-hidden="true" className="icon-inline" size={14} /></Link>
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
          <h2>Pending invoices ({pendingCount})</h2>
          <Link href="/invoices">View all <ArrowRight aria-hidden="true" className="icon-inline" size={14} /></Link>
        </div>
        {pending.length === 0 ? (
          <p className="hint">Nothing pending. Every invoice is paid in full.</p>
        ) : (
          <ul className="attention-list">
            {pending.map((inv) => (
              <li key={inv.id}>
                <span>
                  <Link href={`/invoices/${inv.id}`}>{inv.description}</Link> — {byId.get(inv.clientId)?.name ?? "Unknown client"}
                </span>
                <span><strong>{formatMoney(balanceByInvoice.get(inv.id) ?? computeInvoiceTotal(inv))}</strong> · due {inv.dueDate}</span>
              </li>
            ))}
          </ul>
        )}
        <p className="hint" style={{ marginBottom: 0 }}>Unpaid balances, soonest due first.</p>
      </div>

      <div className="two-col">
        <div className="card" data-reveal>
          <div className="card-head">
            <h2>This month ({month})</h2>
            <p>{monthSummary.count} invoice{monthSummary.count === 1 ? "" : "s"} issued</p>
          </div>
          <p style={{ margin: 0 }}>
            Billed {formatMoney(monthSummary.billed)} · Paid {formatMoney(monthSummary.paid)} · Outstanding {formatMoney(monthSummary.outstanding)}
            {monthSummary.overdueCount > 0 ? ` · ${monthSummary.overdueCount} overdue` : ""}
          </p>
          <p className="hint" style={{ marginBottom: 0 }}>Straight totals from this month&apos;s invoices and payments — no forecast.</p>
        </div>
        <div className="card" data-reveal>
          <div className="card-head">
            <h2>Largest outstanding balances</h2>
            <Link href="/clients">View all <ArrowRight aria-hidden="true" className="icon-inline" size={14} /></Link>
          </div>
          {rankedClients.length === 0 ? (
            <p className="hint" style={{ marginBottom: 0 }}>Nothing outstanding.</p>
          ) : (
            <ul className="attention-list">
              {rankedClients.map(({ client, outstanding }) => (
                <li key={client.id}>
                  <Link href="/clients">{client.name}</Link>
                  <span><strong>{formatMoney(outstanding)}</strong></span>
                </li>
              ))}
            </ul>
          )}
          <p className="hint" style={{ marginBottom: 0 }}>Sorted by outstanding amount, largest first. This is a sort, not a risk prediction.</p>
        </div>
      </div>

      <div className="card" data-reveal>
        <div className="card-head">
          <h2>Recent activity</h2>
          <p>From your real clients, invoices, and payments</p>
        </div>
        {activity.length === 0 ? (
          <p className="hint">Nothing yet.</p>
        ) : (
          <ul className="attention-list">
            {activity.map((a, i) => (
              <li key={`${a.date}-${i}`}>
                <span>{a.text}</span>
                <span>{a.date}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="card" data-reveal>
        <div className="card-head">
          <h2>Recent invoices</h2>
          <Link href="/invoices">View all <ArrowRight aria-hidden="true" className="icon-inline" size={14} /></Link>
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
              <thead><tr><th>Number</th><th>Client</th><th>Description</th><th>Amount</th><th>Status</th><th>Due</th></tr></thead>
              <tbody>
                {recent.map((inv) => (
                  <tr key={inv.id}>
                    <td data-label="Number">{formatInvoiceNumber(inv.number)}</td>
                    <td data-label="Client">{byId.get(inv.clientId)?.name ?? "Unknown client"}</td>
                    <td data-label="Description">{inv.description}</td>
                    <td data-label="Amount">{formatMoney(computeInvoiceTotal(inv))}</td>
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
          <button disabled={resetting} onClick={() => setConfirmReset(true)} type="button">
            {resetting ? "Resetting…" : "Reset demo data"}
          </button>
          {resetDone && <span className="hint" role="status">Demo data restored.</span>}
        </div>
        <ConfirmDialog
          busy={resetting}
          confirmLabel="Reset"
          message="Reset to the demo clients and invoices? Your changes will be lost."
          onClose={() => setConfirmReset(false)}
          onConfirm={async () => { setConfirmReset(false); await resetDemo(); }}
          open={confirmReset}
          title="Reset demo data"
        />
      </div>
      <p className="footer-note">Data is stored in the server database, scoped to your account.</p>
    </Reveal>
  );
}
