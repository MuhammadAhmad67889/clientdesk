"use client";

import { useState } from "react";
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
 * Hover a slice or its legend row to pick it out — the rest fade.
 */
export default function StatusDonut({ slices }: { slices: StatusSlice[] }) {
  const [hovered, setHovered] = useState<StatusSlice["key"] | null>(null);
  const total = slices.reduce((sum, s) => sum + s.amount, 0);
  const radius = 70;
  const circumference = 2 * Math.PI * radius;
  const share = (amount: number) => (total > 0 ? Math.round((amount / total) * 100) : 0);
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
              const dimmed = hovered !== null && hovered !== s.key;
              return (
                <circle
                  key={s.key}
                  cx="90"
                  cy="90"
                  fill="none"
                  opacity={dimmed ? 0.35 : 1}
                  onMouseEnter={() => setHovered(s.key)}
                  onMouseLeave={() => setHovered(null)}
                  r={radius}
                  stroke={COLORS[s.key]}
                  strokeDasharray={`${length} ${circumference - length}`}
                  strokeDashoffset={-dashoffset}
                  strokeWidth="26"
                  style={{ cursor: "pointer", transition: "opacity 0.2s ease" }}
                  transform="rotate(-90 90 90)"
                />
              );
            })}
          </svg>
          <ul style={{ display: "grid", gap: 8, listStyle: "none", margin: 0, padding: 0 }}>
            {slices.map((s) => {
              const dimmed = hovered !== null && hovered !== s.key;
              return (
                <li
                  key={s.key}
                  onMouseEnter={() => setHovered(s.key)}
                  onMouseLeave={() => setHovered(null)}
                  style={{
                    cursor: "pointer",
                    fontSize: "0.9rem",
                    opacity: s.amount === 0 ? 0.55 : dimmed ? 0.45 : 1,
                    transition: "opacity 0.2s ease",
                  }}
                >
                  <span aria-hidden="true" style={{ color: COLORS[s.key] }}>■ </span>
                  {LABELS[s.key]} — {formatMoney(s.amount)} · {s.count} {s.count === 1 ? "invoice" : "invoices"} · {share(s.amount)}%
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
