import type { Metadata } from "next";
import { PublicFooter, PublicNav } from "../../components/Public";

export const metadata: Metadata = {
  description: "ClientDesk privacy policy: what data is stored, where, and how to ask for deletion.",
  title: "Privacy — ClientDesk",
};

export default function PrivacyPage() {
  return (
    <div className="public-wrap">
      <PublicNav />
      <main className="legal">
        <h1>Privacy policy</h1>
        <p className="lead">Short version: we store what you enter, host it with Vercel and Neon, and sell nothing.</p>

        <h2>What we collect</h2>
        <ul>
          <li>Your account email and a hashed password (we cannot read your password).</li>
          <li>Your business name, if you set one in Settings.</li>
          <li>The clients, invoices, recurring templates, and payments you create.</li>
          <li>A session cookie that keeps you signed in for up to 7 days.</li>
        </ul>

        <h2>What we do not collect</h2>
        <p>
          No analytics, no advertising trackers, and no data about you
          from anywhere else. There is nothing to opt out of because
          nothing is tracked.
        </p>

        <h2>Where data lives</h2>
        <p>
          The app is hosted on Vercel and its database on Neon
          (Postgres). Both are third-party services with their own
          security practices; your data is only accessible through your
          signed-in account, and every query in the app is scoped to
          that account.
        </p>

        <h2>Deletion</h2>
        <p>
          Delete individual clients, invoices, or payments inside the
          app whenever you like. To delete your whole account, email us
          from the account&rsquo;s email address and we will remove the
          account and its data.
        </p>

        <h2>Changes</h2>
        <p>
          If this policy changes, the updated version will be posted
          here with the date changed.
        </p>

        <p className="hint">Last updated: 3 November 2026. Contact: muhammadahmad.codes@gmail.com</p>
      </main>
      <PublicFooter />
    </div>
  );
}
