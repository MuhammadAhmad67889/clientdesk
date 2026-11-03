"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { parseInvoiceDraft } from "../lib/drafts";
import type { Client } from "../lib/types";

/** Paste free text, get a draft invoice. The parser is rule-based (see
 * src/lib/drafts.ts for the rules); every field stays editable, and
 * nothing is created until the user presses "Create invoice". */
export default function DraftInvoicePage({ clients }: { clients: Client[] }) {
  const router = useRouter();
  const [text, setText] = useState("");
  const [parsed, setParsed] = useState(false);
  const [clientId, setClientId] = useState("");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  function parse() {
    const draft = parseInvoiceDraft(text, clients);
    setClientId(draft.clientId ?? "");
    setDescription(draft.description);
    setAmount(draft.amount === null ? "" : String(draft.amount));
    setDueDate(draft.dueDate ?? "");
    setParsed(true);
    setErrors({});
  }

  async function create() {
    const next: Record<string, string> = {};
    if (!clientId) next.client = "Choose a client.";
    if (!description.trim()) next.description = "Add a description.";
    const parsedAmount = Number(amount);
    if (!amount || Number.isNaN(parsedAmount) || parsedAmount <= 0) next.amount = "Enter an amount above 0.";
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dueDate)) next.dueDate = "Enter a due date (YYYY-MM-DD).";
    setErrors(next);
    if (Object.keys(next).length > 0) return;
    setSaving(true);
    const res = await fetch("/api/invoices", {
      body: JSON.stringify({
        amount: Math.round(parsedAmount * 100) / 100,
        clientId,
        description: description.trim(),
        discountRate: 0,
        dueDate,
        taxRate: 0,
      }),
      headers: { "Content-Type": "application/json" },
      method: "POST",
    });
    setSaving(false);
    if (res.status === 401) {
      window.location.href = "/login";
      return;
    }
    if (!res.ok) {
      const data = (await res.json().catch(() => null)) as { errors?: Record<string, string> } | null;
      setErrors(data?.errors ?? { form: "Could not create the invoice." });
      return;
    }
    const created = (await res.json()) as { id: string };
    router.push(`/invoices/${created.id}`);
  }

  return (
    <div>
      <div className="card">
        <h2 style={{ marginTop: 0 }}>Paste the details</h2>
        <p className="hint">
          Example: “Website work for Acme Studio, total $1200, due 2026-12-01.”
          The parser takes the largest $-marked amount, a YYYY-MM-DD or
          DD/MM/YYYY date, and the longest client name it finds. Anything
          it misses stays empty for you to fill in.
        </p>
        <label>
          Details
          <textarea onChange={(e) => setText(e.target.value)} rows={5} value={text} />
        </label>
        <button disabled={!text.trim()} onClick={parse} type="button">Parse into a draft</button>
      </div>
      {parsed && (
        <div className="card">
          <h2 style={{ marginTop: 0 }}>Draft — check every field</h2>
          <label>
            Client
            <select onChange={(e) => setClientId(e.target.value)} value={clientId}>
              <option value="">Choose a client…</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </label>
          {errors.client && <p className="error">{errors.client}</p>}
          <label>
            Description
            <input onChange={(e) => setDescription(e.target.value)} value={description} />
          </label>
          {errors.description && <p className="error">{errors.description}</p>}
          <label>
            Amount
            <input inputMode="decimal" onChange={(e) => setAmount(e.target.value)} value={amount} />
          </label>
          {errors.amount && <p className="error">{errors.amount}</p>}
          <label>
            Due date
            <input onChange={(e) => setDueDate(e.target.value)} type="date" value={dueDate} />
          </label>
          {errors.dueDate && <p className="error">{errors.dueDate}</p>}
          {errors.form && <p className="error" role="alert">{errors.form}</p>}
          <button className="primary" disabled={saving} onClick={create} type="button">
            {saving ? "Creating…" : "Create invoice"}
          </button>
        </div>
      )}
    </div>
  );
}
