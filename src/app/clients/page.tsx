"use client";

import { useMemo, useState } from "react";
import { filterClients } from "../../lib/invoices";
import { useStore } from "../../lib/useStore";
import { validateClient } from "../../lib/validation";
import type { Client } from "../../lib/types";

export default function ClientsPage() {
  const { data, loaded, addClient, updateClient, deleteClient } = useStore();
  const [query, setQuery] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [company, setCompany] = useState("");
  const [phone, setPhone] = useState("");
  const [editing, setEditing] = useState<Client | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const clients = useMemo(
    () => (data ? filterClients(data.clients, query) : []),
    [data, query],
  );

  if (!loaded || !data) return <p>Loading…</p>;

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const errs = validateClient({ email, name });
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;
    const payload = {
      company: company.trim() || undefined,
      email: email.trim() || undefined,
      name: name.trim(),
      phone: phone.trim() || undefined,
    };
    if (editing) {
      updateClient(editing.id, payload);
    } else {
      addClient(payload);
    }
    setEditing(null);
    setName(""); setEmail(""); setCompany(""); setPhone(""); setErrors({});
  }

  function startEdit(c: Client) {
    setEditing(c);
    setName(c.name); setEmail(c.email ?? ""); setCompany(c.company ?? ""); setPhone(c.phone ?? "");
    setErrors({});
  }

  return (
    <>
      <h1>Clients</h1>
      <p className="lead">{data.clients.length} client{data.clients.length === 1 ? "" : "s"}. Deleting a client also deletes its invoices.</p>

      <form className="card grid" onSubmit={submit}>
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
        <div className="actions full">
          <button className="primary" type="submit">{editing ? "Save changes" : "Add client"}</button>
          {editing && <button type="button" onClick={() => { setEditing(null); setName(""); setEmail(""); setCompany(""); setPhone(""); }}>Cancel edit</button>}
        </div>
      </form>

      <div className="toolbar">
        <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search name, email, company…" aria-label="Search clients" />
      </div>

      {clients.length === 0 ? (
        <p>No clients match your search.</p>
      ) : (
        <div className="card table-wrap">
          <table>
            <thead><tr><th>Name</th><th>Email</th><th>Company</th><th>Phone</th><th>Actions</th></tr></thead>
            <tbody>
              {clients.map((c) => (
                <tr key={c.id}>
                  <td>{c.name}</td><td>{c.email ?? "—"}</td><td>{c.company ?? "—"}</td><td>{c.phone ?? "—"}</td>
                  <td>
                    <div className="actions">
                      <button onClick={() => startEdit(c)}>Edit</button>
                      {confirmDeleteId === c.id ? (
                        <>
                          <button className="danger" onClick={() => deleteClient(c.id)}>Confirm delete</button>
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
    </>
  );
}
