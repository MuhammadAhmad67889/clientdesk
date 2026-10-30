"use client";

import { useMemo, useState } from "react";
import Reveal from "./Reveal";
import { EmptyState } from "./ui";
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
                    {c.name}
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
