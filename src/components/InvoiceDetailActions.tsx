"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { Invoice } from "../lib/types";

export default function InvoiceDetailActions({ invoice }: { invoice: Invoice }) {
  const router = useRouter();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [busy, setBusy] = useState(false);

  async function togglePaid() {
    if (busy) return;
    setBusy(true);
    const res = await fetch(`/api/invoices/${invoice.id}`, {
      body: JSON.stringify({ paid: invoice.status !== "paid" }),
      headers: { "Content-Type": "application/json" },
      method: "PUT",
    });
    setBusy(false);
    if (res.status === 401) {
      window.location.href = "/login";
      return;
    }
    if (res.ok) router.refresh();
  }

  async function deleteOne() {
    const res = await fetch(`/api/invoices/${invoice.id}`, { method: "DELETE" });
    if (res.status === 401) {
      window.location.href = "/login";
      return;
    }
    if (res.ok) router.push("/invoices");
  }

  return (
    <div className="actions page-actions no-print">
      <button disabled={busy} onClick={togglePaid} type="button">
        {invoice.status === "paid" ? "Mark unpaid" : "Mark paid"}
      </button>
      <button onClick={() => window.print()} type="button">Print / save as PDF</button>
      {confirmDelete ? (
        <>
          <button className="danger" onClick={deleteOne} type="button">Confirm delete</button>
          <button onClick={() => setConfirmDelete(false)} type="button">Cancel</button>
        </>
      ) : (
        <button className="danger" onClick={() => setConfirmDelete(true)} type="button">Delete</button>
      )}
    </div>
  );
}
