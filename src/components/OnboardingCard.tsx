"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

/** The step number in a small frosted circle. The number itself is
 * gradient text; the circle stays glass so the gradient reads on
 * both themes. Rendered here rather than as a CSS counter because
 * a ::before marker can't take the gradient-num class. */
function StepNumber({ n }: { n: number }) {
  return (
    <span aria-hidden="true" className="glass grid h-7 w-7 shrink-0 place-items-center rounded-full">
      <span className="gradient-num text-sm font-bold">{n}</span>
    </span>
  );
}

/** First-run checklist on the dashboard. It is count-based, not a
 * tutorial: demo data satisfies the client and invoice steps, and the
 * card says so. Recording a payment is the one step demo data cannot
 * satisfy, so the card stays until a payment exists or it is dismissed.
 * Dismissal is local to this browser — no account change. */
export default function OnboardingCard({
  clientCount,
  invoiceCount,
  paymentCount,
  paymentHref,
}: {
  clientCount: number;
  invoiceCount: number;
  paymentCount: number;
  paymentHref: string;
}) {
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    setDismissed(window.localStorage.getItem("clientdesk-onboarding-dismissed") === "1");
  }, []);

  if (dismissed || paymentCount > 0) return null;

  function dismiss() {
    window.localStorage.setItem("clientdesk-onboarding-dismissed", "1");
    setDismissed(true);
  }

  return (
    <section className="card glass onboarding" aria-label="Get started">
      <div className="card-head">
        <h2>Get started</h2>
        <button onClick={dismiss} type="button">Dismiss</button>
      </div>
      <p>
        Your account starts with demo data, so the first two steps may
        already look done — replace the demo rows with your own whenever
        you are ready.
      </p>
      <ol className="mt-3 grid list-none gap-3 p-0">
        <li className="flex items-start gap-3">
          <StepNumber n={1} />
          <span>
            {clientCount > 0 ? "✓ " : ""}
            <Link href="/clients">Add a client</Link>
            {clientCount > 0 && " — done"}
          </span>
        </li>
        <li className="flex items-start gap-3">
          <StepNumber n={2} />
          <span>
            {invoiceCount > 0 ? "✓ " : ""}
            <Link href="/invoices">Create an invoice</Link>
            {invoiceCount > 0 && " — done"}
          </span>
        </li>
        <li className="flex items-start gap-3">
          <StepNumber n={3} />
          <span>
            <Link href={paymentHref}>Record a payment</Link>
            {" — open an unpaid invoice and record what arrived"}
          </span>
        </li>
      </ol>
    </section>
  );
}
