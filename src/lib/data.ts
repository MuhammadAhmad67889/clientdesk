import type { PrismaClient } from "@prisma/client";
import { cookies } from "next/headers";
import { hashToken, SESSION_COOKIE, verifySessionCookie } from "./auth";
import { getPrisma } from "./prisma";
import { seedData, todayIso } from "./invoices";
import type { Client, Invoice } from "./types";

export interface SessionUser {
  email: string;
  id: string;
}

function dateToDay(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function toClient(row: {
  company: string | null;
  createdAt: Date;
  email: string | null;
  id: string;
  name: string;
  notes: string | null;
  phone: string | null;
}): Client {
  return {
    company: row.company ?? undefined,
    createdAt: dateToDay(row.createdAt),
    email: row.email ?? undefined,
    id: row.id,
    name: row.name,
    notes: row.notes ?? undefined,
    phone: row.phone ?? undefined,
  };
}

function toInvoice(row: {
  amount: number;
  clientId: string;
  description: string;
  dueDate: string;
  id: string;
  issuedDate: string;
  status: string;
}): Invoice {
  return {
    amount: row.amount,
    clientId: row.clientId,
    description: row.description,
    dueDate: row.dueDate,
    id: row.id,
    issuedDate: row.issuedDate,
    status: row.status === "paid" ? "paid" : "unpaid",
  };
}

/** Resolve the logged-in user from the signed session cookie. Null when absent/invalid/expired. */
export async function getSessionUser(
  db: PrismaClient = getPrisma(),
): Promise<SessionUser | null> {
  let cookieValue: string | undefined;
  try {
    cookieValue = (await cookies()).get(SESSION_COOKIE)?.value;
  } catch {
    return null;
  }
  const parsed = verifySessionCookie(cookieValue);
  if (!parsed) return null;
  try {
    const session = await db.session.findUnique({
      include: { user: true },
      where: { id: parsed.sessionId },
    });
    if (!session || session.expiresAt <= new Date()) return null;
    if (session.tokenHash !== hashToken(parsed.token)) return null;
    return { email: session.user.email, id: session.user.id };
  } catch {
    return null;
  }
}

/** Every query below filters by userId: users only ever see their own rows. */
export async function listClients(userId: string, db: PrismaClient = getPrisma()): Promise<Client[]> {
  const rows = await db.client.findMany({ orderBy: { name: "asc" }, where: { userId } });
  return rows.map(toClient);
}

export async function listInvoices(userId: string, db: PrismaClient = getPrisma()): Promise<Invoice[]> {
  const rows = await db.invoice.findMany({ orderBy: { issuedDate: "desc" }, where: { userId } });
  return rows.map(toInvoice);
}

export async function createClient(
  userId: string,
  input: { company?: string; email?: string; name: string; notes?: string; phone?: string },
  db: PrismaClient = getPrisma(),
): Promise<Client> {
  return toClient(
    await db.client.create({ data: { ...input, userId } }),
  );
}

export async function updateClient(
  userId: string,
  id: string,
  input: { company?: string; email?: string; name: string; notes?: string; phone?: string },
  db: PrismaClient = getPrisma(),
): Promise<Client | null> {
  const existing = await db.client.findFirst({ where: { id, userId } });
  if (!existing) return null;
  return toClient(await db.client.update({ data: input, where: { id } }));
}

export async function deleteClient(userId: string, id: string, db: PrismaClient = getPrisma()): Promise<boolean> {
  const existing = await db.client.findFirst({ where: { id, userId } });
  if (!existing) return false;
  await db.invoice.deleteMany({ where: { clientId: id, userId } });
  await db.client.delete({ where: { id } });
  return true;
}

export async function createInvoice(
  userId: string,
  input: { amount: number; clientId: string; description: string; dueDate: string; status: "paid" | "unpaid" },
  db: PrismaClient = getPrisma(),
): Promise<Invoice | null> {
  // The client must belong to this user too.
  const client = await db.client.findFirst({ where: { id: input.clientId, userId } });
  if (!client) return null;
  return toInvoice(
    await db.invoice.create({
      data: { ...input, issuedDate: todayIso(), userId },
    }),
  );
}

export async function setInvoicePaid(
  userId: string,
  id: string,
  paid: boolean,
  db: PrismaClient = getPrisma(),
): Promise<Invoice | null> {
  const existing = await db.invoice.findFirst({ where: { id, userId } });
  if (!existing) return null;
  return toInvoice(
    await db.invoice.update({ data: { status: paid ? "paid" : "unpaid" }, where: { id } }),
  );
}

export async function deleteInvoice(userId: string, id: string, db: PrismaClient = getPrisma()): Promise<boolean> {
  const existing = await db.invoice.findFirst({ where: { id, userId } });
  if (!existing) return false;
  await db.invoice.delete({ where: { id } });
  return true;
}

/** Seed clearly labelled demo data for one user only, with fresh ids per user. */
export async function seedDemoForUser(userId: string, db: PrismaClient = getPrisma()): Promise<void> {
  const seed = seedData(todayIso());
  const idMap = new Map<string, string>();
  for (const c of seed.clients) {
    const created = await db.client.create({
      data: {
        company: c.company,
        email: c.email,
        name: c.name,
        phone: c.phone,
        userId,
      },
    });
    idMap.set(c.id, created.id);
  }
  for (const inv of seed.invoices) {
    const clientId = idMap.get(inv.clientId);
    if (!clientId) continue;
    await db.invoice.create({
      data: {
        amount: inv.amount,
        clientId,
        description: inv.description,
        dueDate: inv.dueDate,
        issuedDate: inv.issuedDate,
        status: inv.status,
        userId,
      },
    });
  }
}

export async function resetDemoForUser(userId: string, db: PrismaClient = getPrisma()): Promise<void> {
  await db.invoice.deleteMany({ where: { userId } });
  await db.client.deleteMany({ where: { userId } });
  await seedDemoForUser(userId, db);
}
