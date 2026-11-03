"use client";

import { useMemo, useState } from "react";
import { buildReminderDraft } from "../lib/drafts";

/** A fixed reminder template filled with this invoice's real figures.
 * There is no send button — ClientDesk has no email service yet — so
 * the draft is copied and pasted into the user's own email. */
export default function ReminderDraft({
  balance,
  clientName,
  dueDate,
  invoiceNumber,
  paid,
  today,
  total,
}: {
  balance: number;
  clientName: string;
  dueDate: string;
  invoiceNumber: string;
  paid: number;
  today: string;
  total: number;
}) {
  const [copied, setCopied] = useState(false);
  const draft = useMemo(
    () => buildReminderDraft({ balance, clientName, dueDate, invoiceNumber, paid, today, total }),
    [balance, clientName, dueDate, invoiceNumber, paid, today, total],
  );

  async function copy() {
    try {
      await navigator.clipboard.writeText(`${draft.subject}\n\n${draft.body}`);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

  if (balance <= 0) return null;
  return (
    <div className="card" data-reveal>
      <h2 style={{ marginTop: 0 }}>Reminder draft</h2>
      <p className="hint">
        A fixed template with this invoice&apos;s real figures — not AI
        writing. Edit it before sending; ClientDesk cannot send email itself.
      </p>
      <p style={{ marginBottom: 4 }}><strong>Subject:</strong> {draft.subject}</p>
      <p style={{ marginTop: 0, whiteSpace: "pre-wrap" }}>{draft.body}</p>
      <button onClick={copy} type="button">{copied ? "Copied" : "Copy draft"}</button>
    </div>
  );
}
