"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function DeletePaymentButton({
  invoiceId,
  paymentId,
}: {
  invoiceId: string;
  paymentId: string;
}) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);

  async function remove() {
    if (busy) return;
    setBusy(true);
    const res = await fetch(`/api/invoices/${invoiceId}/payments/${paymentId}`, { method: "DELETE" });
    setBusy(false);
    if (res.status === 401) {
      window.location.href = "/login";
      return;
    }
    if (res.ok) router.refresh();
  }

  if (confirming) {
    return (
      <span>
        <button className="danger" disabled={busy} onClick={remove} type="button">Confirm delete</button>{" "}
        <button onClick={() => setConfirming(false)} type="button">Cancel</button>
      </span>
    );
  }
  return <button onClick={() => setConfirming(true)} type="button">Delete</button>;
}
