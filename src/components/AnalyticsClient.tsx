"use client";

import DeltaChip from "./DeltaChip";
import Reveal from "./Reveal";
import { formatMoney, todayIso } from "../lib/invoices";
import {
  currentQuarter,
  deltaVsPrevious,
  monthKey,
  monthlyTable,
  periodTotals,
  previousMonthKey,
  sumBilledByMonth,
  sumPaidByMonth,
} from "../lib/analytics";
import type { Invoice, Payment } from "../lib/types";

export default function AnalyticsClient({
  initialInvoices,
  initialPayments,
}: {
  initialInvoices: Invoice[];
  initialPayments: Payment[];
}) {
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
  const months = monthlyTable(initialInvoices, initialPayments, today);

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
          <h2>Last 6 months</h2>
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
