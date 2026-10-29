"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

export default function AuthNav() {
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/me")
      .then((r) => (r.ok ? r.json() : null))
      .then((d: { email?: string } | null) => setEmail(d?.email ?? null))
      .catch(() => setEmail(null));
  }, []);

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/login";
  }

  return (
    <div className="navlinks">
      {email ? (
        <>
          <Link href="/">Dashboard</Link>
          <Link href="/clients">Clients</Link>
          <Link href="/invoices">Invoices</Link>
          <span className="nav-email">{email}</span>
          <button className="nav-logout" onClick={logout} type="button">
            Log out
          </button>
        </>
      ) : (
        <>
          <Link href="/login">Log in</Link>
          <Link href="/signup">Sign up</Link>
        </>
      )}
    </div>
  );
}
