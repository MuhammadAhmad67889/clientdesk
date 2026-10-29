import { execSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { PrismaClient } from "@prisma/client";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { hashPassword } from "./auth";
import {
  createClient,
  createInvoice,
  deleteClient,
  deleteInvoice,
  listClients,
  listInvoices,
  seedDemoForUser,
  updateClient,
} from "./data";

const dir = mkdtempSync(join(tmpdir(), "clientdesk-isolation-"));
const dbFile = join(dir, "test.db");
const url = `file:${dbFile}`;
let db: PrismaClient;

beforeAll(() => {
  process.env.DATABASE_URL = url;
  process.env.AUTH_SECRET = "test-only-secret-for-isolation-test";
  // Real database: push the committed schema into a throwaway SQLite file.
  execSync("npx prisma db push --skip-generate --accept-data-loss", {
    cwd: join(__dirname, "..", ".."),
    env: { ...process.env, DATABASE_URL: url },
    stdio: "pipe",
  });
  const options = { datasources: { db: { url } } } as unknown as ConstructorParameters<
    typeof PrismaClient
  >[0];
  db = new PrismaClient(options);
}, 120_000);

afterAll(async () => {
  await db.$disconnect().catch(() => undefined);
  rmSync(dir, { force: true, recursive: true });
});

describe("per-user isolation (real SQLite via Prisma)", () => {
  it("user A cannot see, edit, or delete user B's clients and invoices", async () => {
    const userA = await db.user.create({
      data: { email: "a@example.com", passwordHash: hashPassword("password-123") },
    });
    const userB = await db.user.create({
      data: { email: "b@example.com", passwordHash: hashPassword("password-123") },
    });

    const clientA = await createClient(userA.id, { name: "A Client" }, db);
    await createInvoice(
      userA.id,
      { amount: 100, clientId: clientA.id, description: "Work for A", dueDate: "2026-11-01", status: "unpaid" },
      db,
    );
    await seedDemoForUser(userB.id, db);

    // B sees only their own seeded rows, never A's.
    expect((await listClients(userB.id, db)).some((c) => c.id === clientA.id)).toBe(false);
    expect((await listInvoices(userB.id, db)).some((i) => i.clientId === clientA.id)).toBe(false);
    expect((await listClients(userA.id, db)).length).toBe(1);
    expect((await listInvoices(userA.id, db)).length).toBe(1);

    // Cross-user writes are refused.
    expect(await updateClient(userB.id, clientA.id, { name: "Hijacked" }, db)).toBeNull();
    expect(await deleteClient(userB.id, clientA.id, db)).toBe(false);
    const invoiceA = (await listInvoices(userA.id, db))[0];
    expect(await deleteInvoice(userB.id, invoiceA.id, db)).toBe(false);
    expect(
      await createInvoice(
        userB.id,
        { amount: 50, clientId: clientA.id, description: "Nope", dueDate: "2026-11-01", status: "unpaid" },
        db,
      ),
    ).toBeNull();

    // A's rows are untouched.
    expect((await listClients(userA.id, db))[0].name).toBe("A Client");
    expect((await listInvoices(userA.id, db)).length).toBe(1);
  });
});
