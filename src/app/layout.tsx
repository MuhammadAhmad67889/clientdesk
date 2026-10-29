import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  description: "ClientDesk — a single-user freelance client and invoice manager. Demo data is stored in your browser.",
  title: "ClientDesk",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <nav className="topnav">
          <div className="topnav-inner">
            <Link className="brand" href="/">
              ClientDesk
            </Link>
            <div className="navlinks">
              <Link href="/">Dashboard</Link>
              <Link href="/clients">Clients</Link>
              <Link href="/invoices">Invoices</Link>
            </div>
          </div>
        </nav>
        <main className="container">{children}</main>
      </body>
    </html>
  );
}
