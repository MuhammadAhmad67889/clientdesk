"use client";

import { formatMoney } from "../lib/invoices";
import type { ClientRow } from "../lib/analytics";

/** Top clients as horizontal bars — length shows billed, text shows the split. */
export default function TopClients({ rows }: { rows: ClientRow[] }) {
  const max = Math.max(1, ...rows.map((r) => r.billed));
  return (
    <div>
      {rows.length === 0 ? (
        <p className="hint" style={{ margin: 0 }}>No clients with invoices yet.</p>
      ) : (
        <ul className="top-clients" style={{ display: "grid", gap: 14, listStyle: "none", margin: 0, padding: 0 }}>
          {rows.map((r) => (
            <li key={r.id}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.9rem" }}>
                <strong>{r.name}</strong>
                <span style={{ color: "var(--text-2)" }}>
                  Billed {formatMoney(r.billed)} · Paid {formatMoney(r.paid)} · Owes {formatMoney(r.outstanding)}
                </span>
              </div>
              <div aria-hidden="true" style={{ background: "var(--surface-2)", borderRadius: 4, height: 10, marginTop: 4 }}>
                <div style={{ background: "var(--primary)", borderRadius: 4, height: "100%", width: `${(r.billed / max) * 100}%` }} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
