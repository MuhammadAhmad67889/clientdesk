import type { Metadata } from "next";
import { PublicFooter, PublicNav } from "../../components/Public";

export const metadata: Metadata = {
  description: "ClientDesk terms of service, in plain language.",
  title: "Terms — ClientDesk",
};

export default function TermsPage() {
  return (
    <div className="public-wrap">
      <PublicNav />
      <main className="legal">
        <h1>Terms of service</h1>
        <p className="lead">Plain language first. If anything here is unclear, email us and ask.</p>

        <h2>The service</h2>
        <p>
          ClientDesk is a web app for managing freelance clients, invoices,
          and payments. You create an account, and the clients, invoices,
          and payments you enter belong to your account. The service is
          provided as-is: we work to keep it running and correct, but we
          do not guarantee uninterrupted availability.
        </p>

        <h2>Your account</h2>
        <p>
          You are responsible for keeping your password private and for
          everything done under your account. One account per person;
          sharing logins is not supported. If you believe your account
          has been compromised, change your password in Settings and
          tell us.
        </p>

        <h2>Your data</h2>
        <p>
          You must have the right to store the client information you
          enter. ClientDesk stores what you enter and nothing else, and
          never sells it. You can delete your clients, invoices, and
          payments from inside the app at any time. To delete your whole
          account, email us from the account&rsquo;s email address and we will
          remove it.
        </p>

        <h2>Payments and billing</h2>
        <p>
          There is no paid billing yet. Every account is currently free.
          When paid plans open, the pricing page will say so, and nothing
          will be charged without you choosing a plan and completing a
          checkout.
        </p>

        <h2>Acceptable use</h2>
        <p>
          Do not use ClientDesk to break the law, to store data you have
          no right to store, or to attack or abuse the service. Accounts
          doing so may be suspended.
        </p>

        <h2>Changes</h2>
        <p>
          If these terms change in a way that matters, the updated terms
          will be posted here with the date changed. Continued use after
          a change means you accept the new terms.
        </p>

        <p className="hint">Last updated: 3 November 2026. Contact: muhammadahmad.codes@gmail.com</p>
      </main>
      <PublicFooter />
    </div>
  );
}
