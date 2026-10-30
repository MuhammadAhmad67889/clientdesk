"use client";

import Link from "next/link";
import { useMemo, useRef, useState } from "react";
import Reveal from "./Reveal";
import { EmptyState } from "./ui";
import { parseClientsCsv } from "../lib/csv";
import { filterClients } from "../lib/invoices";
import type { Client } from "../lib/types";
import { validateClient } from "../lib/validation";

type SortKey = "name-asc" | "name-desc" | "newest";

export default function ClientsClient({ initialClients }: { initialClients: Client[] }) {
  const [clients, setClients] = useState(initialClients);
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SortKey>("name-asc");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [company, setCompany] = useState("");
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [editing, setEditing] = useState<Client | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [savedNote, setSavedNote] = useState("");
  const [importNote, setImportNote] = useState("");
  const [importing, setImporting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const filtered = useMemo(() => {
    const list = filterClients(clients, query);
    const sorted = [...list];
    if (sort === "name-desc") sorted.sort((a, b) => b.name.localeCompare(a.name));
    else if (sort === "newest") sorted.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    else sorted.sort((a, b) => a.name.localeCompare(b.name));
    return sorted;
  }, [clients, query, sort]);

  function clearForm() {
    setEditing(null);
    setName(""); setEmail(""); setCompany(""); setPhone(""); setNotes(""); setErrors({});
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const errs = validateClient({ email, name });
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;
    if (saving) return;
    setSaving(true);
    const payload = {
      company: company.trim() || undefined,
      email: email.trim() || undefined,
      name: name.trim(),
      notes: notes.trim() || undefined,
      phone: phone.trim() || undefined,
    };
    const res = await fetch(editing ? `/api/clients/${editing.id}` : "/api/clients", {
      body: JSON.stringify(payload),
      headers: { "Content-Type": "application/json" },
      method: editing ? "PUT" : "POST",
    });
    setSaving(false);
    if (res.status === 401) {
      window.location.href = "/login";
      return;
    }
    if (!res.ok) {
      const data = (await res.json().catch(() => null)) as { errors?: Record<string, string> } | null;
      setErrors(data?.errors ?? { form: "Could not save the client." });
      return;
    }
    const saved = (await res.json()) as Client;
    setClients((prev) =>
      editing ? prev.map((c) => (c.id === saved.id ? saved : c)) : [...prev, saved],
    );
    setSavedNote(editing ? "Client updated." : "Client added.");
    clearForm();
  }

  function startEdit(c: Client) {
    setEditing(c);
    setName(c.name); setEmail(c.email ?? ""); setCompany(c.company ?? ""); setPhone(c.phone ?? ""); setNotes(c.notes ?? "");
    setErrors({});
    setSavedNote("");
  }

  async function deleteOne(id: string) {
    const res = await fetch(`/api/clients/${id}`, { method: "DELETE" });
    if (res.status === 401) {
      window.location.href = "/login";
      return;
    }
    if (res.ok) setClients((prev) => prev.filter((c) => c.id !== id));
  }

  async function importFile(file: File) {
    setImporting(true);
    setImportNote("");
    const text = await file.text();
    const parsed = parseClientsCsv(text);
    let imported = 0;
    let failed = 0;
    for (const row of parsed.rows) {
      const res = await fetch("/api/clients", {
        body: JSON.stringify(row),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      });
      if (res.status === 401) {
        window.location.href = "/login";
        return;
      }
      if (res.ok) {
        imported++;
      } else {
        failed++;
      }
    }
    // The loop above awaited each response body in turn; refetching is
    // simpler and guarantees the list matches the server.
    const listRes = await fetch("/api/clients");
    if (listRes.ok) setClients(await listRes.json());
    setImporting(false);
    setImportNote(
      `Imported ${imported} client${imported === 1 ? "" : "s"}. Skipped ${parsed.skipped + failed} row${parsed.skipped + failed === 1 ? "" : "s"} (no name, bad email, or rejected by the server).`,
    );
    if (fileRef.current) fileRef.current.value = "";
  }

  return (
    <Reveal>
      <div className="page-head">
        <h1>Clients</h1>
        <p className="lead">{clients.length} client{clients.length === 1 ? "" : "s"}. Deleting a client also deletes its invoices.</p>
      </div>

      <form className="card grid" data-reveal onSubmit={submit}>
        <h2 className="full" style={{ margin: 0 }}>{editing ? "Edit client" : "Add client"}</h2>
        <label>Name *
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Sara Khan" />
          {errors.name && <span className="error">{errors.name}</span>}
        </label>
        <label>Email
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="sara@example.com" />
          {errors.email && <span className="error">{errors.email}</span>}
        </label>
        <label>Company
          <input value={company} onChange={(e) => setCompany(e.target.value)} placeholder="Northside Bakery" />
        </label>
        <label>Phone
          <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+92 300 111 2222" />
        </label>
        <label className="full">Notes
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Anything worth remembering about this client" rows={2} />
        </label>
        {errors.form && <p className="error full" role="alert">{errors.form}</p>}
        <div className="actions full">
          <button className="primary" disabled={saving} type="submit">{saving ? "Saving…" : editing ? "Save changes" : "Add client"}</button>
          {editing && <button type="button" onClick={clearForm}>Cancel edit</button>}
          {savedNote && <span className="hint" role="status">{savedNote}</span>}
        </div>
      </form>

      <div className="card" data-reveal>
        <h2>Import clients from CSV</h2>
        <p className="hint" style={{ margin: "4px 0 12px" }}>
          Header row with at least <code>name</code>, plus any of <code>email</code>, <code>company</code>, <code>phone</code>, <code>notes</code>.
          Rows without a name or with a bad email are skipped and counted, never imported.
        </p>
        <div className="actions">
          <input
            accept=".csv,text/csv"
            aria-label="Choose a CSV file of clients"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void importFile(file);
            }}
            ref={fileRef}
            type="file"
          />
          {importing && <span className="hint">Importing…</span>}
          {importNote && <span className="hint" role="status">{importNote}</span>}
        </div>
      </div>

      <div className="toolbar">
        <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search name, email, company…" aria-label="Search clients" />
        <select value={sort} onChange={(e) => setSort(e.target.value as SortKey)} aria-label="Sort clients">
          <option value="name-asc">Name A–Z</option>
          <option value="name-desc">Name Z–A</option>
          <option value="newest">Newest first</option>
        </select>
      </div>

      {clients.length === 0 ? (
        <EmptyState
          text="Add your first client above, then create invoices for them."
          title="No clients yet"
        />
      ) : filtered.length === 0 ? (
        <EmptyState
          text="Try a different search term or clear the search to see all clients."
          title="No clients match your search"
        />
      ) : (
        <div className="card table-wrap" data-reveal>
          <table>
            <thead><tr><th>Name</th><th>Email</th><th>Company</th><th>Phone</th><th>Actions</th></tr></thead>
            <tbody>
              {filtered.map((c) => (
                <tr key={c.id}>
                  <td data-label="Name">
                    <Link href={`/clients/${c.id}`}>{c.name}</Link>
                    {c.notes && <><br /><span className="hint">{c.notes}</span></>}
                  </td>
                  <td data-label="Email">{c.email ?? "—"}</td>
                  <td data-label="Company">{c.company ?? "—"}</td>
                  <td data-label="Phone">{c.phone ?? "—"}</td>
                  <td data-label="Actions">
                    <div className="actions">
                      <button onClick={() => startEdit(c)}>Edit</button>
                      {confirmDeleteId === c.id ? (
                        <>
                          <button className="danger" onClick={() => deleteOne(c.id)}>Confirm delete</button>
                          <button onClick={() => setConfirmDeleteId(null)}>Cancel</button>
                        </>
                      ) : (
                        <button className="danger" onClick={() => setConfirmDeleteId(c.id)}>Delete</button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Reveal>
  );
}
