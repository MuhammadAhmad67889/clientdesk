import type { Client, Invoice, Payment, RecurringTemplate } from "./types";

/** Everything a user owns in ClientDesk, in one JSON document.
 * Passwords, sessions and reset tokens are never part of an export:
 * this builder only receives the four lists it is given, so there is
 * no credential field it could leak by accident. */
export interface UserExport {
  clients: Client[];
  exportedAt: string;
  invoices: Invoice[];
  payments: Payment[];
  recurringTemplates: RecurringTemplate[];
  user: { email: string };
}

export function buildUserExport(input: {
  clients: Client[];
  email: string;
  invoices: Invoice[];
  payments: Payment[];
  recurringTemplates: RecurringTemplate[];
}): UserExport {
  return {
    clients: input.clients,
    exportedAt: new Date().toISOString(),
    invoices: input.invoices,
    payments: input.payments,
    recurringTemplates: input.recurringTemplates,
    user: { email: input.email },
  };
}
