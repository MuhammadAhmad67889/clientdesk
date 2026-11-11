"use client";

import { useState } from "react";
import { formatMoney } from "../lib/invoices";
import type { MonthRow } from "../lib/analytics";

/**
 * Billed vs paid per month as paired bars. Hover (or tap) a month
 * to see its exact figures in the line above the chart — the table
 * below still carries them all. The chart is for shape, not precision.
 */
export default function MonthlyBars({ months }: { months: MonthRow[] }) {
  const [hovered, setHovered] = useState<number | null>(null);
  const chartH = 220;
  const plotH = 180;
  const groupW = 56;
  // Room on both sides so the first and last month labels fit —
  // they used to clip at the chart's edges.
  const padX = 30;
  const chartW = Math.max(months.length * groupW, 200);
  const max = Math.max(1, ...months.flatMap((m) => [m.billed, m.paid]));
  const barH = (value: number) => (value / max) * plotH;
  const hasData = months.some((m) => m.billed > 0 || m.paid > 0);
  const active = hovered !== null ? months[hovered] : null;

  return (
    <div>
      <div style={{ display: "flex", gap: 16, fontSize: "0.85rem", marginBottom: 12 }}>
        <span><span aria-hidden="true" style={{ color: "var(--primary)" }}>■ </span>Billed</span>
        <span><span aria-hidden="true" style={{ color: "var(--success)" }}>■ </span>Paid</span>
      </div>
      {hasData ? (
        <>
          <p className="hint" role="status" style={{ margin: "0 0 8px" }}>
            {active ? (
              <>
                <strong style={{ color: "var(--text)" }}>{active.label}:</strong>{" "}
                billed {formatMoney(active.billed)} · paid {formatMoney(active.paid)} · outstanding {formatMoney(active.outstanding)}
              </>
            ) : (
              "Hover a month to see its exact figures."
            )}
          </p>
          <svg aria-label="Billed and paid totals by month" role="img" style={{ height: "auto", width: "100%" }} viewBox={`0 0 ${chartW + padX * 2} ${chartH}`}>
            <title>Billed and paid totals by month</title>
            {months.map((m, i) => {
              const x = padX + i * groupW + 8;
              const dimmed = hovered !== null && hovered !== i;
              return (
                <g
                  key={m.key}
                  aria-label={`${m.label}: billed ${formatMoney(m.billed)}, paid ${formatMoney(m.paid)}, outstanding ${formatMoney(m.outstanding)}`}
                  opacity={dimmed ? 0.4 : 1}
                  onMouseEnter={() => setHovered(i)}
                  onMouseLeave={() => setHovered(null)}
                  style={{ cursor: "pointer" }}
                >
                  <rect fill="var(--primary)" height={barH(m.billed)} width="14" x={x} y={plotH - barH(m.billed)} rx="2" />
                  <rect fill="var(--success)" height={barH(m.paid)} width="14" x={x + 18} y={plotH - barH(m.paid)} rx="2" />
                  <text fill="var(--text-2)" fontSize="11" textAnchor="middle" x={x + 16} y={chartH - 8}>{m.label}</text>
                </g>
              );
            })}
          </svg>
        </>
      ) : (
        <p className="hint" style={{ margin: 0 }}>Nothing billed or paid in this range yet.</p>
      )}
    </div>
  );
}
