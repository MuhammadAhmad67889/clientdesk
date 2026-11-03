"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import AuthShell from "../../components/AuthShell";
import OAuthButtons from "../../components/OAuthButtons";

const OAUTH_ERRORS: Record<string, string> = {
  email: "That account has no verified email, so sign-in could not finish.",
  failed: "Sign-in with that provider failed. Try again or use email instead.",
  state: "That sign-in did not start here. Please try again.",
};

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const oauthError = OAUTH_ERRORS[searchParams.get("oauth") ?? ""] ?? "";
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
    <AuthShell
      lead="Welcome back. Your clients and invoices are private to your account."
      switchNode={
        <>
          <p>No account yet? <Link href="/signup">Sign up</Link>.</p>
          <p className="hint">
            By logging in you agree to the <Link href="/terms">Terms</Link> and{" "}
            <Link href="/privacy">Privacy Policy</Link>.
          </p>
        </>
      }
      title="Log in"
    >
      <OAuthButtons />
      {oauthError && <p className="error full" role="alert">{oauthError}</p>}
      <form className="card grid" onSubmit={submit}>
        <label className="full">Email
          <input autoComplete="email" onChange={(e) => setEmail(e.target.value)} required type="email" value={email} />
        </label>
        <label className="full">Password
          <span className="password-field">
            <input
              autoComplete="current-password"
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
        <div className="actions full"><button className="primary" disabled={busy} type="submit">{busy ? "Logging in…" : "Log in"}</button></div>
      </form>
      <p><Link href="/forgot-password">Forgot your password?</Link></p>
    </AuthShell>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
