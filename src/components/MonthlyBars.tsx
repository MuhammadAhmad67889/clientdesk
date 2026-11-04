"use client";

import type { MonthRow } from "../lib/analytics";

/**
 * Billed vs paid per month as paired bars. The table below it still
 * carries the exact figures — the chart is for shape, not precision.
 */
export default function MonthlyBars({ months }: { months: MonthRow[] }) {
  const chartH = 220;
  const plotH = 180;
  const groupW = 56;
  const chartW = Math.max(months.length * groupW, 200);
  const max = Math.max(1, ...months.flatMap((m) => [m.billed, m.paid]));
  const barH = (value: number) => (value / max) * plotH;
  const hasData = months.some((m) => m.billed > 0 || m.paid > 0);

  return (
    <div>
      <div style={{ display: "flex", gap: 16, fontSize: "0.85rem", marginBottom: 12 }}>
        <span><span aria-hidden="true" style={{ color: "var(--primary)" }}>■ </span>Billed</span>
        <span><span aria-hidden="true" style={{ color: "var(--success)" }}>■ </span>Paid</span>
      </div>
      {hasData ? (
        <svg aria-label="Billed and paid totals by month" role="img" style={{ height: "auto", width: "100%" }} viewBox={`0 0 ${chartW} ${chartH}`}>
          <title>Billed and paid totals by month</title>
          {months.map((m, i) => {
            const x = i * groupW + 8;
            return (
              <g key={m.key}>
                <rect fill="var(--primary)" height={barH(m.billed)} width="14" x={x} y={plotH - barH(m.billed)} rx="2" />
                <rect fill="var(--success)" height={barH(m.paid)} width="14" x={x + 18} y={plotH - barH(m.paid)} rx="2" />
                <text fill="var(--text-2)" fontSize="11" textAnchor="middle" x={x + 16} y={chartH - 8}>{m.label}</text>
              </g>
            );
          })}
        </svg>
      ) : (
        <p className="hint" style={{ margin: 0 }}>Nothing billed or paid in this range yet.</p>
      )}
    </div>
  );
}
