import Link from "next/link";
import InvoiceCalculator from "./InvoiceCalculator";
import { PublicFooter, PublicNav } from "./Public";
import Reveal from "./Reveal";

/** The logged-out home page. Everything it claims already exists in
 * the app — no AI features, no team seats, no billing promises, no
 * invented user counts. The hero image is a real screenshot of the
 * live app running demo data, not a mockup. */

const features = [
  {
    detail: "Search by name or company, sort the list, export it as CSV.",
    text: "Names, companies, emails, phones and notes — searchable, and yours alone.",
    title: "Clients in one place",
  },
  {
    detail: "Line items or a single amount, invoice numbers, discount and tax rates, due dates — the breakdown shows on the invoice, the PDF, and the CSV.",
    text: "Invoice numbers, line items, discount and tax rates, due dates, and totals that add up the same way everywhere.",
    title: "Invoices that add up",
  },
  {
    detail: "Part-payments, paid so far, remaining balance. An invoice flips to paid the moment payments cover it.",
    text: "Record what a client actually paid and when — not just a paid/unpaid toggle.",
    title: "Payments, not just totals",
  },
  {
    detail: "One-page PDF per invoice, generated on the server. CSV exports for clients and invoices, including paid and balance columns — and CSV import for clients.",
    text: "Download an invoice as a PDF, take your data as CSV, or bring a client list in.",
    title: "PDFs and CSVs",
  },
  {
    detail: "Set a monthly retainer once; press Generate due now when it's due. Nothing is generated behind your back.",
    text: "A monthly retainer becomes one invoice when its due date arrives.",
    title: "Recurring invoices",
  },
  {
    detail: "Outstanding, paid, overdue, last six months — plus this month's totals and largest outstanding balances. All computed from your real rows.",
    text: "A dashboard that tells the truth about what you are owed.",
    title: "A dashboard that tells the truth",
  },
  {
    detail: "Billed vs paid bars, an invoice-status donut, top clients, and a collection rate — with a 6 or 12 month range. Totals only, no forecasts.",
    text: "Charts and tables from your real invoices and payments.",
    title: "Analytics that explain themselves",
  },
  {
    detail: "Money received and balances still owed, All, Completed and Pending tabs, and a record-a-payment form on the page itself.",
    text: "Every payment in one place, with the invoice and client beside it.",
    title: "A dedicated payments page",
  },
  {
    detail: "Paste free text and get an editable invoice draft — amount, due date, and client pulled out by rules, never invented. Reminder drafts use your real figures.",
    text: "Drafts from plain text, confirmed by you before anything is saved.",
    title: "Drafts from plain text",
  },
  {
    detail: "Ctrl/Cmd+K searches real clients and invoices. Sort the lists, filter by due date or archive, and page through them.",
    text: "Find anything fast, on desktop and on your phone.",
    title: "Find anything fast",
  },
];

const steps = [
  { text: "One email, one password, your own private workspace. Demo data is included so the pages aren't empty.", title: "Create an account." },
  { text: "Or explore the demo data first — and delete it any time.", title: "Add a client." },
  { text: "Numbers, discount, tax, due dates. Download the PDF when it's ready.", title: "Send an invoice." },
  { text: "Part-payments welcome. The dashboard keeps the outstanding balance honest.", title: "Record payments as they arrive." },
];

const tiers = [
  {
    features: ["10 clients", "30 invoices", "Clients, invoices and payments", "PDF and CSV exports", "Recurring invoices", "Draft helpers"],
    name: "Free",
    note: "Demo data counts toward the limits — 3 demo clients and 5 demo invoices to start.",
    price: "$0",
  },
  {
    features: ["Unlimited clients and invoices", "Everything in Free", "Draft helpers"],
    name: "Pro",
    note: "Billing isn't live yet — every account is on Free until it opens.",
    price: "$9 / month",
  },
  {
    features: ["Everything in Pro"],
    name: "Business",
    note: "Team seats are not available yet — the price is a statement of intent, not a checkout.",
    price: "$19 / month",
  },
];

const faqs = [
  {
    answer: "No. Signing up takes an email and a password, and billing isn't live, so nothing on this site can charge you.",
    question: "Do I need a credit card to sign up?",
  },
  {
    answer: "10 clients and 30 invoices, with everything core included: payments and part-payments, PDFs, CSV exports, recurring invoices, and draft helpers. New accounts start with 3 demo clients and 5 demo invoices, which count toward those limits and can be deleted.",
    question: "What do I get on Free?",
  },
  {
    answer: "Yes. Every account sees only its own clients, invoices, and payments — demo data included. Nothing is shared between accounts.",
    question: "Is my data private?",
  },
  {
    answer: "Yes. Export your clients and invoices as CSV any time, and download any invoice as a one-page PDF.",
    question: "Can I get my data out?",
  },
  {
    answer: "Billing isn't live yet, so there is nothing to cancel today. When it opens, cancelling will keep your data readable and the free limits will apply again — cancelling deletes nothing.",
    question: "What happens if I cancel Pro later?",
  },
  {
    answer: "Delete clients and invoices one by one, or use Reset demo data on the dashboard — careful, that wipes your own entries too and puts the demo ones back. To delete your whole account, email muhammadahmad.codes@gmail.com, as the terms page explains.",
    question: "Can I delete my data?",
  },
  {
    answer: "Not yet — no notifications and no password reset by email until an email service is connected. If you are signed in, you can change your password from Settings instead.",
    question: "Does ClientDesk send emails?",
  },
];

export default function LandingPage() {
  return (
    <Reveal>
    <div className="public-wrap">
      <PublicNav />
      <main>
        <section className="public-hero">
          <h1>Freelance clients and invoices, <span className="gradient-text">without the spreadsheet.</span></h1>
          <p className="lead">
            ClientDesk keeps your clients, invoices, and payments in one
            private account — so you always know who owes you, what is
            overdue, and what you have actually been paid.
          </p>
          <div className="page-actions">
            <Link className="btn btn-primary btn-gradient" href="/signup">Create a free account</Link>
            <Link className="btn" href="/pricing">See pricing</Link>
          </div>
          <p className="hint">Free to start. New accounts include demo data you can explore or delete.</p>
          <figure className="preview-figure">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img alt="ClientDesk dashboard showing totals, recent invoices, and the overdue list" src="/preview-dashboard.webp" />
            <figcaption>The real ClientDesk dashboard, running the demo data a new account starts with.</figcaption>
          </figure>
        </section>

        <nav aria-label="On this page" className="section-nav">
          <a href="#features">Features</a>
          <a href="#how">How it works</a>
          <a href="#calculator">Try the math</a>
          <a href="#plans">Plans</a>
          <a href="#faq">FAQ</a>
        </nav>

        <section id="features">
          <h2>Everything you need to manage your freelance business</h2>
          <div className="feature-grid">
            {features.map((f) => (
              <article className="card" key={f.title}>
                <h3>{f.title}</h3>
                <p>{f.text}</p>
                <p className="hint">{f.detail}</p>
              </article>
            ))}
          </div>
        </section>

        <section id="how">
          <h2>How it works</h2>
          <ol className="steps">
            {steps.map((s) => (
              <li key={s.title}><strong>{s.title}</strong> {s.text}</li>
            ))}
          </ol>
        </section>

        <section id="calculator">
          <h2>Try the math</h2>
          <p>
            Change the numbers and watch the total follow. This is the
            app&apos;s real invoice math — try the example it ships with:
            $200 at 10% off and 10% tax comes to $198.
          </p>
          <InvoiceCalculator />
        </section>

        <section id="plans">
          <h2>Plans that fit your freelance journey</h2>
          <div className="price-grid">
            {tiers.map((tier) => (
              <article className="card price-card" key={tier.name}>
                <h3>{tier.name}</h3>
                <p className="price">{tier.price}</p>
                <p>{tier.note}</p>
                <ul>
                  {tier.features.map((f) => (
                    <li key={f}>{f}</li>
                  ))}
                </ul>
                <Link className="btn btn-primary btn-gradient" href="/signup">Start free</Link>
              </article>
            ))}
          </div>
          <p className="hint">
            Today the only difference between tiers is the limits. Pro and
            Business prices are planned prices, not live offers.{" "}
            <Link href="/pricing">See the full pricing page</Link>.
          </p>
        </section>

        <section id="faq">
          <h2>Frequently asked questions</h2>
          <div className="faq">
            {faqs.map((f) => (
              <details key={f.question}>
                <summary>{f.question}</summary>
                <p>{f.answer}</p>
              </details>
            ))}
          </div>
        </section>

        <section className="final-cta">
          <h2>Ready to leave the spreadsheet behind?</h2>
          <p>
            Create a free account, explore the demo data, and send your
            first real invoice. No credit card, no setup, nothing to install.
          </p>
          <div className="page-actions">
            <Link className="btn btn-primary" href="/signup">Create your free account</Link>
            <Link className="btn" href="/pricing">See pricing</Link>
          </div>
        </section>
      </main>
      <PublicFooter />
    </div>
    </Reveal>
  );
}
