import type { PrismaClient } from "@prisma/client";
import { describe, expect, it } from "vitest";
import { seedDemoForUser } from "./data";
import { computeClientTotals, seedData } from "./invoices";

/**
 * seedDemoForUser against a stub database, so this runs without
 * Postgres (the isolation suite covers the real database on CI).
 * The point of the test: every seeded invoice marked paid must get
 * the payment row that the dashboard totals count, or a fresh
 * account shows $0 paid and the paid invoices as outstanding.
 */
describe("seedDemoForUser", () => {
  it("seeds a payment row for each paid demo invoice, and only those", async () => {
    const clients: { data: Record<string, unknown>; id: string }[] = [];
    const invoices: { data: Record<string, unknown>; id: string }[] = [];
    const payments: Record<string, unknown>[] = [];
    const db = {
      client: {
        create: async ({ data }: { data: Record<string, unknown> }) => {
          const row = { data, id: `db-client-${clients.length + 1}` };
          clients.push(row);
          return row;
        },
      },
      invoice: {
        create: async ({ data }: { data: Record<string, unknown> }) => {
          const row = { data, id: `db-invoice-${invoices.length + 1}` };
          invoices.push(row);
          return row;
        },
      },
      payment: {
        create: async ({ data }: { data: Record<string, unknown> }) => {
          payments.push(data);
          return data;
        },
      },
    } as unknown as PrismaClient;

    await seedDemoForUser("user-1", db);

    expect(clients.length).toBe(3);
    expect(invoices.length).toBe(5);
    // Exactly the two paid seeds: $300 and $600, dated at issue.
    expect(payments.length).toBe(2);
    expect(payments.map((p) => p.amount).sort((a, b) => (a as number) - (b as number))).toEqual([300, 600]);
    expect(payments.map((p) => p.userId)).toEqual(["user-1", "user-1"]);
    const paidSeeds = seedData("2026-11-04").invoices.filter(
      (i) => i.status === "paid",
    );
    for (const [index, payment] of payments.entries()) {
      expect(payment.paidAt).toBe(paidSeeds[index].issuedDate);
      expect(payment.invoiceId).toBe(
        invoices.find((inv) => inv.data.description === paidSeeds[index].description)?.id,
      );
    }

    // And the dashboard totals on the seeded rows now agree with the
    // status flags: $900 paid, $2,500 outstanding. (Pair each payment
    // with its seed invoice: the stub database ids above are internal,
    // so the totals input uses the seed ids the dashboard would see.)
    const paidSeedsForTotals = seedData("2026-11-04").invoices.filter(
      (i) => i.status === "paid",
    );
    const totals = computeClientTotals(
      seedData("2026-11-04").invoices,
      paidSeedsForTotals.map((s, i) => ({
        amount: s.amount,
        id: `pay-${i}`,
        invoiceId: s.id,
        paidAt: payments[i].paidAt as string,
        userId: "user-1",
      })),
      "2026-11-04",
    );
    expect(totals.totalPaid).toBe(900);
    expect(totals.totalOutstanding).toBe(2500);
  });
});
