"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError("");
    const res = await fetch("/api/auth/login", {
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
    setError(data?.errors?.form ?? data?.errors?.email ?? data?.errors?.password ?? "Could not log in.");
  }

  return (
    <>
      <h1>Log in</h1>
      <form className="card grid" onSubmit={submit}>
        <label className="full">Email
          <input autoComplete="email" onChange={(e) => setEmail(e.target.value)} required type="email" value={email} />
        </label>
        <label className="full">Password
          <input autoComplete="current-password" onChange={(e) => setPassword(e.target.value)} required type="password" value={password} />
        </label>
        {error && <p className="error full">{error}</p>}
        <div className="actions full"><button className="primary" disabled={busy} type="submit">{busy ? "Logging in…" : "Log in"}</button></div>
      </form>
      <p>No account yet? <Link href="/signup">Sign up</Link>.</p>
    </>
  );
}
