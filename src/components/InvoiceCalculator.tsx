"use client";

import { useState } from "react";
import { formatMoney, roundMoney, totalForAmount } from "../lib/invoices";

/**
 * The app's invoice math, playable on the landing page: amount, then
 * discount, then tax on what's left. Nothing here is saved — it just
 * shows the exact total a real invoice would carry.
 */
export default function InvoiceCalculator() {
  const [amount, setAmount] = useState("200");
  const [discount, setDiscount] = useState("10");
  const [tax, setTax] = useState("10");
  const parsed = (value: string) => {
    const n = Number(value);
    return Number.isFinite(n) ? n : 0;
  };
  const base = parsed(amount);
  const discountAmount = roundMoney(base * (parsed(discount) / 100));
  const afterDiscount = roundMoney(base - discountAmount);
  const taxAmount = roundMoney(afterDiscount * (parsed(tax) / 100));
  const total = totalForAmount(base, parsed(discount), parsed(tax));

  return (
    <div className="card">
      <div className="calc-row">
        <label>Amount ($)
          <input inputMode="decimal" onChange={(e) => setAmount(e.target.value)} type="number" value={amount} />
        </label>
        <label>Discount (%)
          <input inputMode="decimal" onChange={(e) => setDiscount(e.target.value)} type="number" value={discount} />
        </label>
        <label>Tax (%)
          <input inputMode="decimal" onChange={(e) => setTax(e.target.value)} type="number" value={tax} />
        </label>
      </div>
      <div style={{ display: "grid", gap: 6, marginTop: 16, fontSize: "0.92rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between" }}><span>Subtotal</span><span>{formatMoney(base)}</span></div>
        <div style={{ display: "flex", justifyContent: "space-between" }}><span>Discount</span><span>−{formatMoney(discountAmount)}</span></div>
        <div style={{ display: "flex", justifyContent: "space-between" }}><span>Tax</span><span>+{formatMoney(taxAmount)}</span></div>
        <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 700 }}><span>Total due</span><span>{formatMoney(total)}</span></div>
      </div>
      <p className="hint" style={{ marginBottom: 0 }}>Same math the app uses on every invoice — discount first, then tax on what&apos;s left.</p>
    </div>
  );
}
