"use client";

import Link from "next/link";
import { useState } from "react";

/** Sets a new password from a reset link. The token is single-use
 * and expires after an hour; the server enforces both. */
export default function ResetPasswordForm({ token }: { token: string }) {
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError("");
    const res = await fetch("/api/auth/reset-password", {
      body: JSON.stringify({ password, token }),
      headers: { "Content-Type": "application/json" },
      method: "POST",
    });
    setBusy(false);
    if (res.ok) {
      setDone(true);
      return;
    }
    const data = (await res.json().catch(() => null)) as { errors?: Record<string, string> } | null;
    setError(data?.errors?.form ?? "Could not reset your password.");
  }

  if (done) {
    return (
      <p>
        Your password was changed. <Link href="/login">Log in</Link> with
        the new password.
      </p>
    );
  }
  return (
    <form className="card grid" onSubmit={submit}>
      <label className="full">New password (at least 8 characters)
        <span className="password-field">
          <input
            autoComplete="new-password"
            minLength={8}
            onChange={(e) => setPassword(e.target.value)}
            required
            type={showPassword ? "text" : "password"}
            value={password}
          />
          <button onClick={() => setShowPassword((v) => !v)} type="button">
            {showPassword ? "Hide" : "Show"}
          </button>
        </span>
      </label>
      {error && <p className="error full" role="alert">{error}</p>}
      <div className="actions full"><button className="primary" disabled={busy} type="submit">{busy ? "Changing…" : "Change password"}</button></div>
    </form>
  );
}
