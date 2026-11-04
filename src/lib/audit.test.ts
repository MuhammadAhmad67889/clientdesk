import type { PrismaClient } from "@prisma/client";
import { describe, expect, it } from "vitest";
import { listAuditEntries, recordAudit } from "./audit";

function stubDb(entries: { action: string; createdAt: Date; detail: string | null }[]) {
  return {
    auditLog: {
      create: async ({ data }: { data: Record<string, unknown> }) => {
        entries.push({
          action: data.action as string,
          createdAt: new Date("2026-11-04"),
          detail: (data.detail as string | null) ?? null,
        });
        return data;
      },
      findMany: async () => entries,
    },
  } as unknown as PrismaClient;
}

describe("recordAudit", () => {
  it("writes the action, detail and user id", async () => {
    const entries: { action: string; createdAt: Date; detail: string | null }[] = [];
    await recordAudit("user-1", "invoice.created", "Design work", stubDb(entries));
    expect(entries).toEqual([
      { action: "invoice.created", createdAt: new Date("2026-11-04"), detail: "Design work" },
    ]);
  });

  it("does not throw when logging itself fails", async () => {
    const db = {
      auditLog: {
        create: async () => {
          throw new Error("database down");
        },
      },
    } as unknown as PrismaClient;
    await expect(recordAudit("user-1", "invoice.created", "Design work", db)).resolves.toBeUndefined();
  });
});

describe("listAuditEntries", () => {
  it("returns newest first with plain dates and no null details", async () => {
    const rows = [
      { action: "client.created", createdAt: new Date("2026-11-03"), detail: "Acme" },
      { action: "invoice.created", createdAt: new Date("2026-11-02"), detail: null },
    ];
    const db = { auditLog: { findMany: async () => rows } } as unknown as PrismaClient;
    await expect(listAuditEntries("user-1", 20, db)).resolves.toEqual([
      { action: "client.created", createdAt: "2026-11-03", detail: "Acme" },
      { action: "invoice.created", createdAt: "2026-11-02" },
    ]);
  });
});
