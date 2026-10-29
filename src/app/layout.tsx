import type { Metadata } from "next";
import Link from "next/link";
import AuthNav from "../components/AuthNav";
import "./globals.css";

export const metadata: Metadata = {
  description: "ClientDesk — a freelance client and invoice manager with accounts and a database.",
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
            <AuthNav />
          </div>
        </nav>
        <main className="container">{children}</main>
      </body>
    </html>
  );
}
