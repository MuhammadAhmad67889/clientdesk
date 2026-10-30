"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { formatMoney } from "../lib/invoices";
import type { Client, Invoice } from "../lib/types";

type Item = { id: string; kind: string; label: string; run: () => void; sub?: string };

export default function CommandPalette({ onClose, open }: { onClose: () => void; open: boolean }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [clients, setClients] = useState<Client[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [selected, setSelected] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    setQuery("");
    setSelected(0);
    inputRef.current?.focus();
    Promise.all([fetch("/api/clients"), fetch("/api/invoices")])
      .then(async ([cRes, iRes]) => {
        if (cRes.ok) setClients(await cRes.json());
        if (iRes.ok) setInvoices(await iRes.json());
      })
      .catch(() => undefined);
  }, [open ]);

  const items = useMemo<Item[]>(() => {
    const q = query.trim().toLowerCase();
    const go = (href: string) => () => {
      onClose();
      router.push(href);
    };
    const list: Item[] = [
      { id: "nav-dash", kind: "Go to", label: "Overview", run: go("/") },
      { id: "nav-clients", kind: "Go to", label: "Clients", run: go("/clients") },
      { id: "nav-invoices", kind: "Go to", label: "Invoices", run: go("/invoices") },
      { id: "add-client", kind: "Create", label: "Add a client", run: go("/clients") },
      { id: "add-invoice", kind: "Create", label: "Add an invoice", run: go("/invoices") },
    ];
    if (q) {
      const matchedClients = clients.filter((c) =>
        [c.name, c.email ?? "", c.company ?? ""].join(" ").toLowerCase().includes(q),
      );
      const matchedInvoices = invoices.filter((i) =>
        i.description.toLowerCase().includes(q),
      );
      for (const c of matchedClients.slice(0, 5)) {
        list.push({ id: `client-${c.id}`, kind: "Client", label: c.name, run: go("/clients"), sub: c.company });
      }
      for (const inv of matchedInvoices.slice(0, 5)) {
        const client = clients.find((c) => c.id === inv.clientId);
        list.push({
          id: `invoice-${inv.id}`,
          kind: "Invoice",
          label: inv.description,
          run: go("/invoices"),
          sub: `${client?.name ?? "Unknown client"} · ${formatMoney(inv.amount)}`,
        });
      }
    }
    return list;
  }, [clients, invoices, onClose, query, router]);

  useEffect(() => setSelected(0), [query]);

  if (!open) return null;

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Escape") onClose();
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelected((s) => Math.min(s + 1, items.length - 1));
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelected((s) => Math.max(s - 1, 0));
    }
    if (e.key === "Enter" && items[selected]) items[selected].run();
  }

  return (
    <div className="cmd-backdrop" onClick={onClose} role="presentation">
      <div
        aria-label="Command palette"
        className="cmd-box"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
      >
        <input
          aria-label="Search commands, clients, and invoices"
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder="Search or jump to… (clients, invoices, pages)"
          ref={inputRef}
          value={query}
        />
        <ul className="cmd-list">
          {items.length === 0 && <li style={{ padding: "12px 16px", color: "var(--text-2)" }}>No matches yet.</li>}
          {items.map((item, i) => (
            <li key={item.id}>
              <button
                className={i === selected ? "selected" : ""}
                onClick={item.run}
                onMouseEnter={() => setSelected(i)}
                type="button"
              >
                <span>
                  {item.label}
                  {item.sub && <span style={{ color: "var(--text-2)", fontWeight: 400 }}> — {item.sub}</span>}
                </span>
                <span className="cmd-kind">{item.kind}</span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
