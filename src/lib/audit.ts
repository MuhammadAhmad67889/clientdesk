import type { PrismaClient } from "@prisma/client";
import { getPrisma } from "./prisma";

export interface AuditEntry {
  action: string;
  createdAt: string;
  detail?: string;
}

/** Write one audit entry. Best-effort on purpose: if logging fails,
 * the user's own change must still go through, so a logging failure
 * is swallowed here instead of failing the mutation it describes. */
export async function recordAudit(
  userId: string,
  action: string,
  detail: string | undefined,
  db: PrismaClient = getPrisma(),
): Promise<void> {
  try {
    await db.auditLog.create({ data: { action, detail: detail ?? null, userId } });
  } catch {
    // Audit logging must never break the change it records.
  }
}

/** Plain words for the audit actions stored in the database, shared
 * by every page that shows the activity feed. Unknown actions fall
 * back to the stored action string itself, so a new action never
 * renders as a blank row. */
const auditLabels: Record<string, string> = {
  "client.archived": "Client archived",
  "client.created": "Client added",
  "client.deleted": "Client deleted",
  "client.unarchived": "Client unarchived",
  "client.updated": "Client updated",
  "invoice.created": "Invoice created",
  "invoice.deleted": "Invoice deleted",
  "invoice.paid": "Invoice marked paid",
  "invoice.unpaid": "Invoice marked unpaid",
  "invoice.updated": "Invoice updated",
  "payment.deleted": "Payment deleted",
  "payment.recorded": "Payment recorded",
  "recurring.created": "Recurring invoice added",
  "recurring.deleted": "Recurring invoice stopped",
};

export function auditActionLabel(action: string): string {
  return auditLabels[action] ?? action;
}

/** The user's most recent audit entries, newest first. */
export async function listAuditEntries(
  userId: string,
  limit = 20,
  db: PrismaClient = getPrisma(),
): Promise<AuditEntry[]> {
  const rows = await db.auditLog.findMany({
    orderBy: { createdAt: "desc" },
    take: limit,
    where: { userId },
  });
  return rows.map((row) => ({
    action: row.action,
    createdAt: row.createdAt.toISOString().slice(0, 10),
    detail: row.detail ?? undefined,
  }));
}
