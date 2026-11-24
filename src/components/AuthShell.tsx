"use client";

import Link from "next/link";
import Reveal from "./Reveal";
import ThreeScene from "./ThreeScene";

export default function AuthShell({
  children,
  lead,
  switchNode,
  title,
}: {
  children: React.ReactNode;
  lead: string;
  switchNode: React.ReactNode;
  title: string;
}) {
  return (
    <Reveal>
    <div className="auth-shell">
      <div className="auth-form-col">
        <div className="auth-box">
          <Link className="brand" href="/">
            <span className="brand-mark">C</span>
            <span>ClientDesk</span>
          </Link>
          <h1>{title}</h1>
          <p className="lead">{lead}</p>
          {children}
          {switchNode}
        </div>
      </div>
      <aside
        aria-hidden="true"
        className="auth-preview"
        style={{
          background:
            "radial-gradient(480px 260px at 85% 0%, rgba(124, 58, 237, 0.22), transparent 60%), radial-gradient(420px 240px at 0% 100%, rgba(37, 99, 235, 0.18), transparent 60%), linear-gradient(160deg, #070b16 0%, #0d1526 55%, #1e1b4b 100%)",
        }}
      >
        <ThreeScene />
        <h2>Clients and invoices, without the spreadsheet chaos.</h2>
        <p>ClientDesk is a freelance client and invoice manager built for people who bill real work.</p>
        <ul>
          <li>Track clients, notes, and contact details in one place</li>
          <li>See what is outstanding, paid, and overdue at a glance</li>
          <li>Export invoices to CSV and print them when you need to</li>
          <li>Your data stays private to your account</li>
        </ul>
        <div className="preview-card glow-soft">
          <strong>Overview</strong>
          <span>Outstanding, paid, and overdue totals — plus the invoices that need your attention first.</span>
        </div>
      </aside>
    </div>
    </Reveal>
  );
}
