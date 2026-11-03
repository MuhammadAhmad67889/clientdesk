"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { formatMoney } from "../lib/invoices";

export default function RecordPaymentForm({
  balance,
  invoiceId,
}: {
  balance: number;
  invoiceId: string;
}) {
  const router = useRouter();
  const [amount, setAmount] = useState("");
  const [paidAt, setPaidAt] = useState("");
  const [error, setError] = useState("");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  if (balance <= 0) {
    return <p className="hint" style={{ margin: 0 }}>Fully paid — no balance remains.</p>;
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (saving) return;
    setSaving(true);
    setError("");
    const res = await fetch(`/api/invoices/${invoiceId}/payments`, {
      body: JSON.stringify({ amount: Number(amount), paidAt: paidAt || undefined }),
      headers: { "Content-Type": "application/json" },
      method: "POST",
    });
    setSaving(false);
    if (res.status === 401) {
      window.location.href = "/login";
      return;
    }
    if (!res.ok) {
      const data = (await res.json().catch(() => null)) as { errors?: Record<string, string>; error?: string } | null;
      setError(data?.errors?.amount ?? data?.errors?.paidAt ?? data?.error ?? "Could not record the payment.");
      return;
    }
    setAmount("");
    setPaidAt("");
    setNote("Payment recorded.");
    router.refresh();
  }

  return (
    <form className="grid" onSubmit={submit}>
      <p className="hint full" style={{ margin: 0 }}>Remaining balance: <strong>{formatMoney(balance)}</strong></p>
      <label>Payment amount ($) *
        <input type="number" min="0" step="0.01" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="100.00" />
      </label>
      <label>Payment date — optional, defaults to today
        <input type="date" value={paidAt} onChange={(e) => setPaidAt(e.target.value)} />
      </label>
      {error && <p className="error full" role="alert">{error}</p>}
      <div className="actions full">
        <button className="primary" disabled={saving} type="submit">{saving ? "Saving…" : "Record payment"}</button>
        {note && <span className="hint" role="status">{note}</span>}
      </div>
    </form>
  );
}
