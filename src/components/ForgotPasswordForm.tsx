"use client";

import { useState } from "react";

/** Asks for a reset link. The answer is the same whether or not the
 * account exists, so the form cannot be used to test for accounts. */
export default function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError("");
    const res = await fetch("/api/auth/forgot-password", {
      body: JSON.stringify({ email }),
      headers: { "Content-Type": "application/json" },
      method: "POST",
    });
    setBusy(false);
    if (res.ok) {
      setSent(true);
      return;
    }
    const data = (await res.json().catch(() => null)) as { errors?: Record<string, string> } | null;
    setError(data?.errors?.form ?? "Could not send a reset link.");
  }

  if (sent) {
    return (
      <p>
        If an account exists for that email, a reset link was sent. It
        works for one hour and can be used once.
      </p>
    );
  }
  return (
    <form className="card grid" onSubmit={submit}>
      <label className="full">Email
        <input autoComplete="email" onChange={(e) => setEmail(e.target.value)} required type="email" value={email} />
      </label>
      {error && <p className="error full" role="alert">{error}</p>}
      <div className="actions full"><button className="primary" disabled={busy} type="submit">{busy ? "Sending…" : "Send reset link"}</button></div>
    </form>
  );
}
