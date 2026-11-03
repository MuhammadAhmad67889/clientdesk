import type { Metadata } from "next";
import Link from "next/link";
import { PublicFooter, PublicNav } from "../../components/Public";

export const metadata: Metadata = {
  description: "ClientDesk pricing: free for up to 10 clients and 30 invoices, Pro at $9/month when billing opens.",
  title: "Pricing — ClientDesk",
};

const tiers = [
  {
    cta: "Start free",
    features: ["Up to 10 clients", "Up to 30 invoices", "Payments and PDFs", "CSV import and export", "Recurring invoices", "Dashboard and overdue list"],
    name: "Free",
    note: "For trying ClientDesk out, or for a very small client list.",
    price: "$0",
  },
  {
    cta: "Start free, upgrade later",
    features: ["Unlimited clients and invoices", "Everything in Free", "AI invoice and reminder drafts (coming soon)", "Priority support"],
    name: "Pro",
    note: "Billing isn't live yet — every account is on Free until it opens.",
    price: "$9 / month",
  },
  {
    cta: "Start free, talk to us later",
    features: ["Everything in Pro", "Team seats (coming later)", "A say in what gets built next"],
    name: "Business",
    note: "For small teams. Not available yet — the price is a statement of intent, not a checkout.",
    price: "$19 / month",
  },
];

export default function PricingPage() {
  return (
    <div className="public-wrap">
      <PublicNav />
      <main>
        <section className="public-hero">
          <h1>Pricing</h1>
          <p className="lead">
            Start free. Upgrade when you need more room — and only when
            billing is actually live. Nothing on this page charges you:
            there is no checkout yet.
          </p>
        </section>
        <section className="price-grid">
          {tiers.map((tier) => (
            <article className="card price-card" key={tier.name}>
              <h2>{tier.name}</h2>
              <p className="price">{tier.price}</p>
              <p>{tier.note}</p>
              <ul>
                {tier.features.map((f) => (
                  <li key={f}>{f}</li>
                ))}
              </ul>
              <Link className="btn btn-primary" href="/signup">{tier.cta}</Link>
            </article>
          ))}
        </section>
        <p className="hint">
          Demo data counts toward the free limits — a new account starts
          with 3 demo clients and 5 demo invoices, which you can delete.
          Pro and Business prices are planned prices, not live offers.
        </p>
      </main>
      <PublicFooter />
    </div>
  );
}
