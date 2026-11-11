"use client";

import { useState } from "react";
import DeltaChip from "./DeltaChip";
import MonthlyBars from "./MonthlyBars";
import Reveal from "./Reveal";
import StatusDonut from "./StatusDonut";
import TopClients from "./TopClients";
import { formatMoney, todayIso } from "../lib/invoices";
import {
  collectionRate,
  currentQuarter,
  deltaVsPrevious,
  monthKey,
  monthlyTable,
  periodTotals,
  previousMonthKey,
  statusBreakdown,
  sumBilledByMonth,
  sumPaidByMonth,
  topClients,
} from "../lib/analytics";
import type { Client, Invoice, Payment } from "../lib/types";

export default function AnalyticsClient({
  initialClients,
  initialInvoices,
  initialPayments,
}: {
  initialClients: Client[];
  initialInvoices: Invoice[];
  initialPayments: Payment[];
}) {
  // How many months the chart and table cover; the stat cards above
  // stay "this month" whatever the range, so the two never mix.
  const [range, setRange] = useState(6);
  const today = todayIso();
  const thisMonthKey = monthKey(today);
  const lastMonthKey = previousMonthKey(thisMonthKey);
  const billedByMonth = sumBilledByMonth(initialInvoices);
  const paidByMonth = sumPaidByMonth(initialPayments);
  const billedDelta = deltaVsPrevious(
    billedByMonth.get(thisMonthKey) ?? 0,
    billedByMonth.get(lastMonthKey) ?? 0,
  );
  const paidDelta = deltaVsPrevious(
    paidByMonth.get(thisMonthKey) ?? 0,
    paidByMonth.get(lastMonthKey) ?? 0,
  );
  const issuedThisMonth = initialInvoices.filter((inv) => monthKey(inv.issuedDate) === thisMonthKey);
  const quarter = currentQuarter(today);
  const quarterTotals = periodTotals(initialInvoices, initialPayments, quarter.start, quarter.end);
  const months = monthlyTable(initialInvoices, initialPayments, today, range);
  const rate = collectionRate(initialInvoices, initialPayments);
  const statuses = statusBreakdown(initialInvoices, initialPayments, today);
  const clients = topClients(initialInvoices, initialPayments, initialClients);
  // Plain-language summary for the range the chart shows.
  const rangeBilled = months.reduce((sum, m) => sum + m.billed, 0);
  const rangePaid = months.reduce((sum, m) => sum + m.paid, 0);
  const rangeOutstanding = months.reduce((sum, m) => sum + m.outstanding, 0);

  return (
    <Reveal>
      <div className="page-head">
        <h1>Analytics</h1>
        <p className="lead">Trends from your real invoices and payments. Totals only — no forecasts, no predictions.</p>
      </div>

      <div className="stats">
        <div className="stat" data-reveal>
          <span>Billed this month</span><strong>{formatMoney(billedByMonth.get(thisMonthKey) ?? 0)}</strong>
          <DeltaChip delta={billedDelta} />
        </div>
        <div className="stat" data-reveal>
          <span>Paid this month</span><strong>{formatMoney(paidByMonth.get(thisMonthKey) ?? 0)}</strong>
          <DeltaChip delta={paidDelta} />
        </div>
        <div className="stat" data-reveal>
          <span>Issued this month</span><strong>{issuedThisMonth.length}</strong>
          <small>{issuedThisMonth.length === 1 ? "invoice" : "invoices"}</small>
        </div>
        <div className="stat" data-reveal>
          <span>Collection rate</span><strong>{rate === null ? "—" : `${rate}%`}</strong>
          <small>{rate === null ? "Nothing billed yet" : "Paid share of all billed money"}</small>
        </div>
      </div>

      <div className="card" data-reveal>
        <div className="card-head">
          <h2>Billed vs paid</h2>
          <div style={{ display: "flex", gap: 6 }} role="group" aria-label="Months shown">
            <button className={range === 3 ? "btn btn-primary" : "btn"} onClick={() => setRange(3)} type="button">3 months</button>
            <button className={range === 6 ? "btn btn-primary" : "btn"} onClick={() => setRange(6)} type="button">6 months</button>
            <button className={range === 12 ? "btn btn-primary" : "btn"} onClick={() => setRange(12)} type="button">12 months</button>
          </div>
        </div>
        <p style={{ margin: "0 0 12px" }}>
          In the last {range} months you billed {formatMoney(rangeBilled)}, got paid {formatMoney(rangePaid)}, and {formatMoney(rangeOutstanding)} is still outstanding.
        </p>
        <MonthlyBars months={months} />
      </div>

      <div className="card" data-reveal>
        <div className="card-head">
          <h2>Invoice status</h2>
          <p>By invoice total, so the slices add up to total billed</p>
        </div>
        <StatusDonut slices={statuses} />
      </div>

      <div className="card" data-reveal>
        <div className="card-head">
          <h2>Top clients</h2>
          <p>By billed total, highest first</p>
        </div>
        <TopClients rows={clients} />
      </div>

      <div className="card" data-reveal>
        <div className="card-head">
          <h2>This quarter ({quarter.key})</h2>
          <p>{quarter.start} to {quarter.end}</p>
        </div>
        <p style={{ margin: 0 }}>
          Billed {formatMoney(quarterTotals.billed)} · Paid {formatMoney(quarterTotals.paid)} · Outstanding {formatMoney(quarterTotals.outstanding)}
        </p>
        <p className="hint" style={{ marginBottom: 0 }}>
          Invoices issued inside the quarter. Outstanding is what those invoices still owe right now.
        </p>
      </div>

      <div className="card table-wrap" data-reveal>
        <div className="card-head">
          <h2>Last {range} months</h2>
          <p>Billed by issued month · paid by payment month</p>
        </div>
        <table>
          <thead><tr><th>Month</th><th>Billed</th><th>Paid</th><th>Outstanding</th></tr></thead>
          <tbody>
            {months.map((m) => (
              <tr key={m.key}>
                <td data-label="Month">{m.label}</td>
                <td data-label="Billed">{formatMoney(m.billed)}</td>
                <td data-label="Paid">{formatMoney(m.paid)}</td>
                <td data-label="Outstanding">{formatMoney(m.outstanding)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="hint">Outstanding is what each month&apos;s invoices still owe right now, so a payment dated later still reduces its original month.</p>
      </div>
    </Reveal>
  );
}
