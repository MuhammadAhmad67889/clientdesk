"use client";

import { useCallback, useEffect, useState } from "react";
import type { Client, Invoice, StoreData } from "./types";
import { newId, parseStoredData, serializeData, STORAGE_KEY } from "./storage";
import { seedData, todayIso } from "./invoices";

export function useStore() {
  const [data, setData] = useState<StoreData | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      setData(parseStoredData(raw, todayIso()));
    } catch {
      setData(seedData(todayIso()));
    }
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (!loaded || !data) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, serializeData(data));
    } catch {
      // Storage full or unavailable: keep in-memory state only.
    }
  }, [data, loaded]);

  const resetDemo = useCallback(() => {
    setData(seedData(todayIso()));
  }, []);

  const addClient = useCallback((client: Omit<Client, "createdAt" | "id">) => {
    const entry: Client = { ...client, createdAt: todayIso(), id: newId("client") };
    setData((prev) => (prev ? { ...prev, clients: [...prev.clients, entry] } : prev));
    return entry;
  }, []);

  const updateClient = useCallback((id: string, patch: Partial<Client>) => {
    setData((prev) =>
      prev
        ? { ...prev, clients: prev.clients.map((c) => (c.id === id ? { ...c, ...patch, id } : c)) }
        : prev,
    );
  }, []);

  const deleteClient = useCallback((id: string) => {
    setData((prev) =>
      prev
        ? {
            clients: prev.clients.filter((c) => c.id !== id),
            invoices: prev.invoices.filter((i) => i.clientId !== id),
          }
        : prev,
    );
  }, []);

  const addInvoice = useCallback((invoice: Omit<Invoice, "id" | "issuedDate">) => {
    const entry: Invoice = { ...invoice, id: newId("invoice"), issuedDate: todayIso() };
    setData((prev) => (prev ? { ...prev, invoices: [...prev.invoices, entry] } : prev));
    return entry;
  }, []);

  const setInvoicePaid = useCallback((id: string, paid: boolean) => {
    setData((prev) =>
      prev
        ? {
            ...prev,
            invoices: prev.invoices.map((i) =>
              i.id === id ? { ...i, status: paid ? "paid" : "unpaid" } : i,
            ),
          }
        : prev,
    );
  }, []);

  const deleteInvoice = useCallback((id: string) => {
    setData((prev) =>
      prev ? { ...prev, invoices: prev.invoices.filter((i) => i.id !== id) } : prev,
    );
  }, []);

  return {
    addClient,
    addInvoice,
    data,
    deleteClient,
    deleteInvoice,
    loaded,
    resetDemo,
    setInvoicePaid,
    updateClient,
  };
}
