import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  description: "ClientDesk checkout complete.",
  title: "Checkout complete — ClientDesk",
};

export default function BillingSuccessPage() {
  return (
    <div className="card" style={{ maxWidth: 560, margin: "48px auto" }}>
      <h1>Checkout complete</h1>
      <p>
        If the payment went through, Stripe tells ClientDesk through its
        webhook and your account switches to Pro — check Settings in a
        moment to confirm. If it still shows Free, wait a minute and
        refresh; the switch is not instant.
      </p>
      <div className="page-actions">
        <Link className="btn btn-primary" href="/settings">Go to Settings</Link>
        <Link className="btn" href="/">Back to Overview</Link>
      </div>
    </div>
  );
}
