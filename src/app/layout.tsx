import type { Metadata } from "next";
import { Inter } from "next/font/google";
import Shell from "../components/Shell";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  description: "ClientDesk — a freelance client and invoice manager with accounts and a database.",
  title: "ClientDesk",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={inter.variable}>
        <Shell>{children}</Shell>
      </body>
    </html>
  );
}
