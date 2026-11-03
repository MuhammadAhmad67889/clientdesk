"use client";

import { useState } from "react";

export default function BillingSection({
  billingConfigured,
  hasStripeCustomer,
  plan,
  subscriptionStatus,
}: {
  billingConfigured: boolean;
  hasStripeCustomer: boolean;
  plan: string;
  subscriptionStatus: string | null;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function go(endpoint: string) {
    setBusy(true);
    setError("");
    const res = await fetch(endpoint, { method: "POST" });
    setBusy(false);
    if (res.status === 401) {
      window.location.href = "/login";
      return;
    }
    const data = (await res.json().catch(() => null)) as { error?: string; url?: string } | null;
    if (!res.ok || !data?.url) {
      setError(data?.error ?? "Something went wrong.");
      return;
    }
    window.location.href = data.url;
  }

  if (!billingConfigured) {
    return (
      <div className="card">
        <h2>Billing</h2>
        <p className="hint" style={{ marginBottom: 0 }}>
          Billing is not set up yet. Pro checkout opens once Stripe is
          connected in test mode — until then every account stays on Free
          and nothing here charges you.
        </p>
      </div>
    );
  }

  if (plan === "pro" || plan === "business") {
    return (
      <div className="card">
        <h2>Billing</h2>
        <p style={{ margin: 0 }}>
          You are on <strong>{plan === "pro" ? "Pro" : "Business"}</strong>
          {subscriptionStatus ? ` (subscription ${subscriptionStatus})` : ""}.
        </p>
        <p className="hint">
          Manage or cancel your subscription in Stripe&apos;s portal.
          Cancelling keeps your data readable; the free limits apply
          again once the subscription ends.
        </p>
        <button disabled={busy || !hasStripeCustomer} onClick={() => go("/api/billing/portal")} type="button">
          {busy ? "Opening…" : "Manage billing"}
        </button>
        {error && <p className="error" role="alert">{error}</p>}
      </div>
    );
  }

  return (
    <div className="card">
      <h2>Billing</h2>
      <p style={{ margin: 0 }}>
        You are on the <strong>Free</strong> plan.
      </p>
      <p className="hint">
        Pro is $9/month with unlimited clients and invoices. Checkout
        runs in Stripe test mode — use a test card, no real money moves.
      </p>
      <button className="primary" disabled={busy} onClick={() => go("/api/billing/checkout")} type="button">
        {busy ? "Starting checkout…" : "Upgrade to Pro"}
      </button>
      {error && <p className="error" role="alert">{error}</p>}
    </div>
  );
}
