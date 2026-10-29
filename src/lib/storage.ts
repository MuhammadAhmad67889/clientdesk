import type { StoreData } from "./types";
import { seedData } from "./invoices";

export const STORAGE_KEY = "clientdesk:v1";

export function parseStoredData(raw: string | null, today: string): StoreData {
  if (!raw) return seedData(today);
  try {
    const parsed = JSON.parse(raw) as Partial<StoreData>;
    if (!Array.isArray(parsed.clients) || !Array.isArray(parsed.invoices)) {
      return seedData(today);
    }
    return { clients: parsed.clients, invoices: parsed.invoices };
  } catch {
    return seedData(today);
  }
}

export function serializeData(data: StoreData): string {
  return JSON.stringify(data);
}

export function newId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}
