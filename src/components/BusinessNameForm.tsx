"use client";

import { useState } from "react";

export default function BusinessNameForm({ initialName }: { initialName: string }) {
  const [name, setName] = useState(initialName);
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (saving) return;
    setSaving(true);
    const res = await fetch("/api/me", {
      body: JSON.stringify({ businessName: name.trim() }),
      headers: { "Content-Type": "application/json" },
      method: "PUT",
    });
    setSaving(false);
    if (res.status === 401) {
      window.location.href = "/login";
      return;
    }
    setNote(res.ok ? "Business name saved. It appears on your invoice PDFs." : "Could not save the business name.");
  }

  return (
    <form className="card grid" onSubmit={submit}>
      <h2 className="full" style={{ margin: 0 }}>Business name</h2>
      <p className="hint full" style={{ margin: 0 }}>
        Optional. Shown at the top of invoice PDFs. Leave it blank to use no business name.
      </p>
      <label className="full">Business name
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Your business name" maxLength={100} />
      </label>
      <div className="actions full">
        <button className="primary" disabled={saving} type="submit">{saving ? "Saving…" : "Save business name"}</button>
        {note && <span className="hint" role="status">{note}</span>}
      </div>
    </form>
  );
}
