import Link from "next/link";

/** Shared header and footer for the public pages (landing, pricing,
 * terms, privacy). Logged-in app pages use the sidebar Shell instead. */

export function PublicNav() {
  return (
    <header className="public-nav">
      <Link className="public-brand" href="/">ClientDesk</Link>
      <nav aria-label="Public navigation">
        <Link href="/pricing">Pricing</Link>
        <Link href="/login">Log in</Link>
        <Link className="btn btn-primary" href="/signup">Sign up free</Link>
      </nav>
    </header>
  );
}

export function PublicFooter() {
  return (
    <footer className="public-footer">
      <span>ClientDesk — freelance clients and invoices, without the spreadsheet.</span>
      <nav aria-label="Footer navigation">
        <Link href="/pricing">Pricing</Link>
        <Link href="/terms">Terms</Link>
        <Link href="/privacy">Privacy</Link>
        <Link href="/login">Log in</Link>
      </nav>
    </footer>
  );
}
