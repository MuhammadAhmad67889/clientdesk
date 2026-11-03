"use client";

import Link from "next/link";
import { Menu, X } from "lucide-react";
import { useState } from "react";

/** Shared header and footer for the public pages (landing, pricing,
 * terms, privacy). Logged-in app pages use the sidebar Shell instead.
 * The header menu collapses to a button on small screens. */

export function PublicNav() {
  const [open, setOpen] = useState(false);
  return (
    <header className="public-nav">
      <Link className="public-brand" href="/">ClientDesk</Link>
      <button
        aria-expanded={open}
        aria-label={open ? "Close menu" : "Open menu"}
        className="nav-toggle"
        onClick={() => setOpen((v) => !v)}
        type="button"
      >
        {open ? <X size={20} /> : <Menu size={20} />}
      </button>
      <nav aria-label="Public navigation" className={open ? "open" : ""} onClick={() => setOpen(false)}>
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
      <span>Questions? muhammadahmad.codes@gmail.com</span>
      <nav aria-label="Footer navigation">
        <Link href="/pricing">Pricing</Link>
        <Link href="/terms">Terms</Link>
        <Link href="/privacy">Privacy</Link>
        <Link href="/login">Log in</Link>
      </nav>
    </footer>
  );
}
