"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import AuthShell from "../../components/AuthShell";

export default function SignupPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError("");
    const res = await fetch("/api/auth/signup", {
      body: JSON.stringify({ email, password }),
      headers: { "Content-Type": "application/json" },
      method: "POST",
    });
    if (res.ok) {
      router.push("/");
      router.refresh();
      return;
    }
    setBusy(false);
    const data = (await res.json().catch(() => null)) as { errors?: Record<string, string> } | null;
    setError(
      data?.errors?.email ?? data?.errors?.password ?? "Could not create an account.",
    );
  }

  return (
    <AuthShell
      lead="Your data is private to your account. Demo data is added to new accounts only, and you can reset or delete it."
      switchNode={<p>Already have an account? <Link href="/login">Log in</Link>.</p>}
      title="Create your account"
    >
      <form className="card grid" onSubmit={submit}>
        <label className="full">Email
          <input autoComplete="email" onChange={(e) => setEmail(e.target.value)} required type="email" value={email} />
        </label>
        <label className="full">Password (at least 8 characters)
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
        <div className="actions full"><button className="primary" disabled={busy} type="submit">{busy ? "Creating account…" : "Create account"}</button></div>
      </form>
    </AuthShell>
  );
}
