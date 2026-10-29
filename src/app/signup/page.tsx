"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function SignupPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
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
    const data = (await res.json().catch(() => null)) as { errors?: Record<string, string> } | null;
    setError(
      data?.errors?.email ?? data?.errors?.password ?? "Could not create an account.",
    );
  }

  return (
    <>
      <h1>Sign up</h1>
      <p className="lead">Your data is private to your account. Demo data is added to new accounts only, and you can reset or delete it.</p>
      <form className="card grid" onSubmit={submit}>
        <label className="full">Email
          <input autoComplete="email" onChange={(e) => setEmail(e.target.value)} required type="email" value={email} />
        </label>
        <label className="full">Password (at least 8 characters)
          <input autoComplete="new-password" minLength={8} onChange={(e) => setPassword(e.target.value)} required type="password" value={password} />
        </label>
        {error && <p className="error full">{error}</p>}
        <div className="actions full"><button className="primary" type="submit">Create account</button></div>
      </form>
      <p>Already have an account? <Link href="/login">Log in</Link>.</p>
    </>
  );
}
