"use client";

import { useState } from "react";

/** Self-serve account deletion. Two steps on purpose: the first
 * click only reveals the confirmation, and the delete itself needs
 * the user's own email typed in — so a stray click can never wipe
 * an account. On success the session is gone, so go to the login
 * page. */
export default function DeleteAccountForm({ email }: { email: string }) {
  const [confirming, setConfirming] = useState(false);
  const [confirmation, setConfirmation] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (confirmation.trim() !== email) {
      setError("Type your email address exactly to confirm deletion.");
      return;
    }
    if (busy) return;
    setBusy(true);
    setError("");
    const res = await fetch("/api/me", {
      body: JSON.stringify({ confirmation: confirmation.trim() }),
      headers: { "Content-Type": "application/json" },
      method: "DELETE",
    });
    setBusy(false);
    if (!res.ok) {
      const data = (await res.json().catch(() => null)) as { error?: string } | null;
      setError(data?.error ?? "Could not delete your account.");
      return;
    }
    window.location.href = "/login";
  }

  if (!confirming) {
    return (
      <div>
        <p className="hint" style={{ margin: 0 }}>
          Deleting your account permanently removes your clients, invoices, payments and history.
          Export your data first if you want to keep it.
        </p>
        <div className="page-actions">
          <button className="btn danger" onClick={() => setConfirming(true)} type="button">
            Delete my account
          </button>
        </div>
      </div>
    );
  }

  return (
    <form className="grid" onSubmit={submit}>
      <p className="hint full" style={{ margin: 0 }}>
        This cannot be undone. Type your email address to confirm.
      </p>
      <label className="full">Your email address
        <input
          autoComplete="off"
          onChange={(e) => setConfirmation(e.target.value)}
          required
          type="text"
          value={confirmation}
        />
        {error && <span className="error">{error}</span>}
      </label>
      <div className="page-actions full">
        <button className="btn danger" disabled={busy} type="submit">
          {busy ? "Deleting…" : "Yes, delete everything"}
        </button>
        <button className="btn" onClick={() => setConfirming(false)} type="button">
          Keep my account
        </button>
      </div>
    </form>
  );
}
