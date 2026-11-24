"use client";

import { auditActionLabel, type AuditEntry } from "../lib/audit";

/** The user's real change log, newest first — every row is an
 * AuditLog entry written when the change happened. Read-only: this
 * feed never writes anything. */
export default function ActivityFeed({ entries }: { entries: AuditEntry[] }) {
  return (
    <div className="card glass" data-reveal>
      <div className="card-head">
        <h2 style={{ margin: 0 }}>Recent activity</h2>
        <p>Your actual change log</p>
      </div>
      {entries.length === 0 ? (
        <p className="hint" style={{ marginBottom: 0 }}>
          Nothing recorded yet — changes you make will appear here.
        </p>
      ) : (
        <ul className="attention-list" style={{ marginBottom: 0 }}>
          {entries.map((entry, i) => (
            <li key={`${entry.createdAt}-${entry.action}-${i}`}>
              <span>
                {auditActionLabel(entry.action)}
                {entry.detail ? ` — ${entry.detail}` : ""}
              </span>
              <span>{entry.createdAt}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
