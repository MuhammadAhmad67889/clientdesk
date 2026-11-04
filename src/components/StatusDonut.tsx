"use client";

import { formatMoney } from "../lib/invoices";
import type { StatusSlice } from "../lib/analytics";

const COLORS: Record<StatusSlice["key"], string> = {
  overdue: "var(--error)",
  paid: "var(--success)",
  partial: "var(--primary)",
  unpaid: "var(--text-2)",
};

const LABELS: Record<StatusSlice["key"], string> = {
  overdue: "Overdue",
  paid: "Paid",
  partial: "Partly paid",
  unpaid: "Unpaid",
};

/**
 * One slice per invoice bucket, sized by invoice totals, so the donut
 * always adds up to total billed. Slices are drawn as stroked circles
 * because that keeps the math to one circumference, not arc paths.
 */
export default function StatusDonut({ slices }: { slices: StatusSlice[] }) {
  const total = slices.reduce((sum, s) => sum + s.amount, 0);
  const radius = 70;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;

  return (
    <div>
      {total === 0 ? (
        <p className="hint" style={{ margin: 0 }}>No invoices yet.</p>
      ) : (
        <div style={{ alignItems: "center", display: "flex", flexWrap: "wrap", gap: 24 }}>
          <svg aria-label="Invoice totals by status" role="img" height="180" width="180" viewBox="0 0 180 180">
            <title>Invoice totals by status</title>
            {slices.map((s) => {
              if (s.amount === 0) return null;
              const length = (s.amount / total) * circumference;
              const dashoffset = offset;
              offset += length;
              return (
                <circle
                  key={s.key}
                  cx="90"
                  cy="90"
                  fill="none"
                  r={radius}
                  stroke={COLORS[s.key]}
                  strokeDasharray={`${length} ${circumference - length}`}
                  strokeDashoffset={-dashoffset}
                  strokeWidth="26"
                  transform="rotate(-90 90 90)"
                />
              );
            })}
          </svg>
          <ul style={{ display: "grid", gap: 8, listStyle: "none", margin: 0, padding: 0 }}>
            {slices.map((s) => (
              <li key={s.key} style={{ fontSize: "0.9rem" }}>
                <span aria-hidden="true" style={{ color: COLORS[s.key] }}>■ </span>
                {LABELS[s.key]} — {formatMoney(s.amount)} · {s.count} {s.count === 1 ? "invoice" : "invoices"}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
