import { execSync } from "node:child_process";
import { randomBytes } from "node:crypto";
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

// Real Postgres, like production. The test creates one throwaway database
// per run on the server named by TEST_POSTGRES_URL (defaults to a local
// Postgres with the postgres/postgres login CI and local setup both use),
// pushes the committed schema into it, and drops it afterwards.
const baseUrl =
  process.env.TEST_POSTGRES_URL ?? "postgresql://postgres:postgres@localhost:5432/postgres";
const dbName = `clientdesk_test_${randomBytes(6).toString("hex")}`;
const url = new URL(baseUrl);
url.pathname = `/${dbName}`;
const dbUrl = url.toString();
let db: PrismaClient;
let admin: PrismaClient;

beforeAll(async () => {
  process.env.DATABASE_URL = dbUrl;
  process.env.DATABASE_URL_UNPOOLED = dbUrl;
  process.env.AUTH_SECRET = "test-only-secret-for-isolation-test";
  admin = new PrismaClient({ datasources: { db: { url: baseUrl } } });
  await admin.$executeRawUnsafe(`CREATE DATABASE "${dbName}"`);
  // Real database: push the committed schema into the throwaway database.
  execSync("npx prisma db push --skip-generate --accept-data-loss", {
    cwd: join(__dirname, "..", ".."),
    env: { ...process.env, DATABASE_URL: dbUrl, DATABASE_URL_UNPOOLED: dbUrl },
    stdio: "pipe",
  });
  const options = { datasources: { db: { url: dbUrl } } } as unknown as ConstructorParameters<
    typeof PrismaClient
  >[0];
  db = new PrismaClient(options);
}, 120_000);

afterAll(async () => {
  await db.$disconnect().catch(() => undefined);
  await admin.$disconnect().catch(() => undefined);
  const cleanup = new PrismaClient({ datasources: { db: { url: baseUrl } } });
  await cleanup.$executeRawUnsafe(`DROP DATABASE IF EXISTS "${dbName}"`).catch(() => undefined);
  await cleanup.$disconnect().catch(() => undefined);
});

describe("per-user isolation (real Postgres via Prisma)", () => {
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
