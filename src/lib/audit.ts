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
