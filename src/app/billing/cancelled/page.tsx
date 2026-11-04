import type { Metadata } from "next";
import Link from "next/link";
import Reveal from "../../../components/Reveal";

export const metadata: Metadata = {
  description: "ClientDesk checkout cancelled.",
  title: "Checkout cancelled — ClientDesk",
};

export default function BillingCancelledPage() {
  return (
    <Reveal>
    <div className="card" style={{ maxWidth: 560, margin: "48px auto" }}>
      <h1>Checkout cancelled</h1>
      <p>Nothing was charged, and your account is unchanged.</p>
      <div className="page-actions">
        <Link className="btn btn-primary" href="/pricing">Back to pricing</Link>
        <Link className="btn" href="/settings">Go to Settings</Link>
      </div>
    </div>
    </Reveal>
  );
}
