import Link from "next/link";
import { PublicFooter, PublicNav } from "./Public";

/** The logged-out home page. Everything it claims already exists in
 * the app — no AI features, no team seats, no billing promises. */

const features = [
  { title: "Clients in one place", text: "Names, companies, emails, phones and notes — searchable, and yours alone." },
  { title: "Invoices that add up", text: "Discount first, then tax on the discounted amount, with the breakdown shown on every invoice." },
  { title: "Payments, not just totals", text: "Record part-payments, see paid and remaining balance, and watch an invoice flip to paid when it's covered." },
  { title: "PDFs and CSVs", text: "Download an invoice as a one-page PDF, or export your clients and invoices as CSV." },
  { title: "Recurring invoices", text: "A monthly retainer becomes one invoice when its due date arrives — nothing generated behind your back." },
  { title: "A dashboard that tells the truth", text: "Outstanding, paid, overdue, and the last six months — all computed from your real invoices." },
];

export default function LandingPage() {
  return (
    <div className="public-wrap">
      <PublicNav />
      <main>
        <section className="public-hero">
          <h1>Freelance clients and invoices, without the spreadsheet.</h1>
          <p className="lead">
            ClientDesk keeps your clients, invoices, and payments in one
            private account — so you always know who owes you, what is
            overdue, and what you have actually been paid.
          </p>
          <div className="page-actions">
            <Link className="btn btn-primary" href="/signup">Create a free account</Link>
            <Link className="btn" href="/pricing">See pricing</Link>
          </div>
          <p className="hint">Free to start. New accounts include demo data you can explore or delete.</p>
        </section>

        <section>
          <h2>What you get</h2>
          <div className="feature-grid">
            {features.map((f) => (
              <article className="card" key={f.title}>
                <h3>{f.title}</h3>
                <p>{f.text}</p>
              </article>
            ))}
          </div>
        </section>

        <section>
          <h2>How it works</h2>
          <ol className="steps">
            <li><strong>Create an account.</strong> One email, one password, your own private workspace.</li>
            <li><strong>Add a client and send an invoice.</strong> Or explore the demo data first — it resets any time.</li>
            <li><strong>Record payments as they arrive.</strong> The dashboard keeps the outstanding balance honest.</li>
          </ol>
        </section>

        <section>
          <h2>Simple pricing</h2>
          <p className="lead">
            Free for up to 10 clients and 30 invoices. Pro at $9/month
            removes the limits when billing opens.{" "}
            <Link href="/pricing">See the full pricing page</Link>.
          </p>
        </section>
      </main>
      <PublicFooter />
    </div>
  );
}
