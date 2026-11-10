import type { Metadata } from "next";
import { Inter } from "next/font/google";
import Script from "next/script";
import Shell from "../components/Shell";
import ToastProvider from "../components/Toast";
import { getSessionUser } from "../lib/data";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  description: "ClientDesk — a freelance client and invoice manager with accounts and a database.",
  title: "ClientDesk",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // The shell depends on auth, not on the path: signed-in users get the
  // sidebar app, everyone else gets the page's own chrome (landing and
  // public pages render their own header/footer; login/signup render
  // their own split screen). Pages still check the session themselves,
  // so this choice never grants access on its own.
  const user = await getSessionUser();
  return (
    <html lang="en">
      <body className={inter.variable}>
        <ToastProvider>{user ? <Shell>{children}</Shell> : <main>{children}</main>}</ToastProvider>
        {/* Support chat widget: adds the floating "Support" button from the
            live ClientDesk Support Agent app. */}
        <Script
          src="https://clientdesk-support.vercel.app/widget.js"
          data-base="https://clientdesk-support.vercel.app"
          strategy="afterInteractive"
        />
      </body>
    </html>
  );
}
