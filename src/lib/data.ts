import type { PrismaClient } from "@prisma/client";
import { cookies } from "next/headers";
import { hashEquals, hashToken, SESSION_COOKIE, verifySessionCookie } from "./auth";
import { getPrisma } from "./prisma";
import { applyInvoiceEdit, applyPaymentDeletion, buildDuplicateInput, computeAmountPaid, computeInvoiceTotal, computeItemsSubtotal, computeRemainingBalance, seedData, todayIso } from "./invoices";
import type { InvoiceItemInput } from "./invoices";
import { addMonths, dueTemplates } from "./recurring";
import type { Client, Invoice, Payment, RecurringTemplate } from "./types";

export interface SessionUser {
  businessName?: string;
  email: string;
  id: string;
  plan: string;
}

function dateToDay(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function toClient(row: {
  archived: boolean;
  company: string | null;
  createdAt: Date;
  email: string | null;
  id: string;
  name: string;
  notes: string | null;
  phone: string | null;
}): Client {
  return {
    archived: row.archived,
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
  discountRate: number;
  dueDate: string;
  id: string;
  issuedDate: string;
  items?: { description: string; id: string; quantity: number; unitPrice: number }[];
  number: number | null;
  status: string;
  taxRate: number;
}): Invoice {
  return {
    amount: row.amount,
    clientId: row.clientId,
    description: row.description,
    discountRate: row.discountRate,
    dueDate: row.dueDate,
    id: row.id,
    issuedDate: row.issuedDate,
    items: row.items?.map((it) => ({
      description: it.description,
      id: it.id,
      quantity: it.quantity,
      unitPrice: it.unitPrice,
    })),
    number: row.number,
    status: row.status === "paid" ? "paid" : "unpaid",
    taxRate: row.taxRate,
  };
}

function toPayment(row: {
  amount: number;
  id: string;
  invoiceId: string;
  method: string | null;
  paidAt: string;
  reference: string | null;
  userId: string;
}): Payment {
  return {
    amount: row.amount,
    id: row.id,
    invoiceId: row.invoiceId,
    method: row.method ?? undefined,
    paidAt: row.paidAt,
    reference: row.reference ?? undefined,
    userId: row.userId,
  };
}

/** Next per-user invoice number: one past the user's current maximum. */
async function nextInvoiceNumber(userId: string, db: PrismaClient): Promise<number> {
  const max = await db.invoice.aggregate({ _max: { number: true }, where: { userId } });
  return (max._max.number ?? 0) + 1;
}

export async function updateBusinessName(userId: string, businessName: string, db: PrismaClient = getPrisma()): Promise<void> {
  await db.user.update({ data: { businessName: businessName ? businessName : null }, where: { id: userId } });
}

function toRecurring(row: {
  amount: number;
  clientId: string;
  createdAt: Date;
  description: string;
  discountRate: number;
  id: string;
  nextDueDate: string;
  taxRate: number;
  userId: string;
}): RecurringTemplate {
  return {
    amount: row.amount,
    clientId: row.clientId,
    createdAt: dateToDay(row.createdAt),
    description: row.description,
    discountRate: row.discountRate,
    id: row.id,
    nextDueDate: row.nextDueDate,
    taxRate: row.taxRate,
    userId: row.userId,
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
    if (!session || !hashEquals(session.tokenHash, hashToken(parsed.token))) return null;
    if (session.expiresAt <= new Date()) {
      await db.session.delete({ where: { id: session.id } }).catch(() => undefined);
      return null;
    }
    return { businessName: session.user.businessName ?? undefined, email: session.user.email, id: session.user.id, plan: session.user.plan };
  } catch {
    return null;
  }
}

/** A user's plan plus how many clients and invoices they already have. */
export async function getUsage(
  userId: string,
  db: PrismaClient = getPrisma(),
): Promise<{ clientCount: number; invoiceCount: number; plan: string }> {
  const [user, clientCount, invoiceCount] = await Promise.all([
    db.user.findUnique({ where: { id: userId } }),
    db.client.count({ where: { userId } }),
    db.invoice.count({ where: { userId } }),
  ]);
  return { clientCount, invoiceCount, plan: user?.plan ?? "free" };
}

/** Billing state for Settings. Keys never leave the server; callers
 * pass only these fields to the client. */
export async function getBilling(
  userId: string,
  db: PrismaClient = getPrisma(),
): Promise<{
  hasStripeCustomer: boolean;
  plan: string;
  subscriptionStatus: string | null;
}> {
  const user = await db.user.findUnique({ where: { id: userId } });
  return {
    hasStripeCustomer: Boolean(user?.stripeCustomerId),
    plan: user?.plan ?? "free",
    subscriptionStatus: user?.subscriptionStatus ?? null,
  };
}

/** Every query below filters by userId: users only ever see their own rows. */
export async function listClients(userId: string, db: PrismaClient = getPrisma()): Promise<Client[]> {
  const rows = await db.client.findMany({ orderBy: { name: "asc" }, where: { userId } });
  return rows.map(toClient);
}

export async function listInvoices(userId: string, db: PrismaClient = getPrisma()): Promise<Invoice[]> {
  const rows = await db.invoice.findMany({
    include: { items: true },
    orderBy: { issuedDate: "desc" },
    where: { userId },
  });
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
  // Undefined means "cleared in the form" here, so store null instead of
  // leaving the old value in place (Prisma skips undefined fields).
  return toClient(await db.client.update({
    data: {
      company: input.company ?? null,
      email: input.email ?? null,
      name: input.name,
      notes: input.notes ?? null,
      phone: input.phone ?? null,
    },
    where: { id },
  }));
}

export async function deleteClient(userId: string, id: string, db: PrismaClient = getPrisma()): Promise<boolean> {
  const existing = await db.client.findFirst({ where: { id, userId } });
  if (!existing) return false;
  // One transaction: if the client delete fails, its invoices must not
  // already be gone.
  await db.$transaction([
    db.invoice.deleteMany({ where: { clientId: id, userId } }),
    db.client.delete({ where: { id } }),
  ]);
  return true;
}

export async function setClientArchived(
  userId: string,
  id: string,
  archived: boolean,
  db: PrismaClient = getPrisma(),
): Promise<Client | null> {
  const existing = await db.client.findFirst({ where: { id, userId } });
  if (!existing) return null;
  return toClient(await db.client.update({ data: { archived }, where: { id } }));
}

export async function createInvoice(
  userId: string,
  input: { amount: number; clientId: string; description: string; discountRate: number; dueDate: string; items?: InvoiceItemInput[]; status: "paid" | "unpaid"; taxRate: number },
  db: PrismaClient = getPrisma(),
): Promise<Invoice | null> {
  // The client must belong to this user too.
  const client = await db.client.findFirst({ where: { id: input.clientId, userId } });
  if (!client) return null;
  // With line items, the stored amount is their subtotal, so the
  // discount-then-tax math and every old total keep working.
  const amount = input.items && input.items.length > 0
    ? computeItemsSubtotal(input.items)
    : input.amount;
  const { items, ...rest } = input;
  const created = await db.invoice.create({
    data: {
      ...rest,
      amount,
      issuedDate: todayIso(),
      items: items && items.length > 0 ? { create: items } : undefined,
      number: await nextInvoiceNumber(userId, db),
      userId,
    },
    include: { items: true },
  });
  return toInvoice(created);
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

/**
 * Edit an invoice's terms. Scoped to the user's invoice; the client,
 * issued date, number and payments are never changed by an edit.
 */
export async function updateInvoice(
  userId: string,
  id: string,
  input: { amount: number; description: string; discountRate: number; dueDate: string; items?: InvoiceItemInput[]; taxRate: number },
  db: PrismaClient = getPrisma(),
): Promise<Invoice | null> {
  const existing = await db.invoice.findFirst({ where: { id, userId } });
  if (!existing) return null;
  const paymentRows = await db.payment.findMany({ where: { invoiceId: id, userId } });
  const payments = paymentRows.map(toPayment);
  const updated = applyInvoiceEdit(toInvoice(existing), payments, input);
  await db.invoice.update({
    data: { amount: updated.amount, description: updated.description, discountRate: updated.discountRate, dueDate: updated.dueDate, status: updated.status, taxRate: updated.taxRate },
    where: { id },
  });
  if (input.items !== undefined) {
    // Replace the item rows wholesale: an edit is the whole list.
    await db.$transaction([
      db.invoiceItem.deleteMany({ where: { invoiceId: id } }),
      ...(input.items.length > 0
        ? [db.invoiceItem.createMany({ data: input.items.map((it) => ({ ...it, invoiceId: id })) })]
        : []),
    ]);
  }
  const refreshed = await db.invoice.findUnique({ include: { items: true }, where: { id } });
  return refreshed ? toInvoice(refreshed) : null;
}

export async function deleteInvoice(userId: string, id: string, db: PrismaClient = getPrisma()): Promise<boolean> {
  const existing = await db.invoice.findFirst({ where: { id, userId } });
  if (!existing) return false;
  await db.invoice.delete({ where: { id } });
  return true;
}

/**
 * Duplicate an invoice for a repeat job: a fresh invoice with the
 * same client and terms, issued today, unpaid, with no payments
 * carried over. Returns null when the original is not the user's.
 */
export async function duplicateInvoice(
  userId: string,
  id: string,
  db: PrismaClient = getPrisma(),
): Promise<Invoice | null> {
  const existing = await db.invoice.findFirst({ where: { id, userId } });
  if (!existing) return null;
  return createInvoice(userId, buildDuplicateInput(toInvoice(existing)), db);
}

export async function listRecurringTemplates(userId: string, db: PrismaClient = getPrisma()): Promise<RecurringTemplate[]> {
  const rows = await db.recurringTemplate.findMany({ orderBy: { nextDueDate: "asc" }, where: { userId } });
  return rows.map(toRecurring);
}

export async function createRecurringTemplate(
  userId: string,
  input: { amount: number; clientId: string; description: string; discountRate: number; nextDueDate: string; taxRate: number },
  db: PrismaClient = getPrisma(),
): Promise<RecurringTemplate | null> {
  const client = await db.client.findFirst({ where: { id: input.clientId, userId } });
  if (!client) return null;
  return toRecurring(await db.recurringTemplate.create({ data: { ...input, userId } }));
}

export async function deleteRecurringTemplate(userId: string, id: string, db: PrismaClient = getPrisma()): Promise<boolean> {
  const existing = await db.recurringTemplate.findFirst({ where: { id, userId } });
  if (!existing) return false;
  await db.recurringTemplate.delete({ where: { id } });
  return true;
}

/**
 * Generate one invoice per due template, then advance each template by
 * one month. One invoice per run on purpose: a template months overdue
 * never surprises the user with a bulk of backdated invoices at once.
 */
export async function generateDueRecurring(
  userId: string,
  today: string,
  db: PrismaClient = getPrisma(),
): Promise<Invoice[]> {
  const templates = await listRecurringTemplates(userId, db);
  const created: Invoice[] = [];
  for (const t of dueTemplates(templates, today)) {
    const invoice = await db.invoice.create({
      data: {
        amount: t.amount,
        clientId: t.clientId,
        description: t.description,
        discountRate: t.discountRate,
        dueDate: t.nextDueDate,
        issuedDate: today,
        number: await nextInvoiceNumber(userId, db),
        status: "unpaid",
        taxRate: t.taxRate,
        userId,
      },
    });
    await db.recurringTemplate.update({
      data: { nextDueDate: addMonths(t.nextDueDate, 1) },
      where: { id: t.id },
    });
    created.push(toInvoice(invoice));
  }
  return created;
}

export async function listPaymentsForInvoice(userId: string, invoiceId: string, db: PrismaClient = getPrisma()): Promise<Payment[]> {
  const invoice = await db.invoice.findFirst({ where: { id: invoiceId, userId } });
  if (!invoice) return [];
  const rows = await db.payment.findMany({ orderBy: { paidAt: "asc" }, where: { invoiceId, userId } });
  return rows.map(toPayment);
}

export async function listPayments(userId: string, db: PrismaClient = getPrisma()): Promise<Payment[]> {
  const rows = await db.payment.findMany({ orderBy: { paidAt: "asc" }, where: { userId } });
  return rows.map(toPayment);
}

/**
 * Record a payment. Returns null when the invoice is not the user's, or
 * the amount exceeds the remaining balance. When payments reach the
 * invoice total, the invoice flips to paid automatically. A repeat
 * submission with the same idempotency key returns the original
 * payment instead of creating a second one.
 */
export async function recordPayment(
  userId: string,
  invoiceId: string,
  input: { amount: number; idempotencyKey?: string; method?: string; paidAt: string; reference?: string },
  db: PrismaClient = getPrisma(),
): Promise<Payment | null> {
  const invoice = await db.invoice.findFirst({ where: { id: invoiceId, userId } });
  if (!invoice) return null;
  if (input.idempotencyKey) {
    const prior = await db.payment.findFirst({ where: { idempotencyKey: input.idempotencyKey, userId } });
    if (prior) return toPayment(prior);
  }
  const inv = toInvoice(invoice);
  const existing = await db.payment.findMany({ where: { invoiceId, userId } });
  const paid = existing.map(toPayment);
  if (input.amount - computeRemainingBalance(inv, paid) > 0.001) return null;
  const created = await db.payment.create({
    data: {
      amount: input.amount,
      idempotencyKey: input.idempotencyKey ?? null,
      invoiceId,
      method: input.method ?? null,
      paidAt: input.paidAt,
      reference: input.reference ?? null,
      userId,
    },
  });
  const newPaid = computeAmountPaid([...paid, toPayment(created)]);
  if (newPaid >= computeInvoiceTotal(inv) - 0.001) {
    await db.invoice.update({ data: { status: "paid" }, where: { id: invoiceId } });
  }
  return toPayment(created);
}

/**
 * Delete one recorded payment. Scoped to the user's invoice; returns
 * false when the payment is not theirs. A paid invoice whose
 * remaining payments no longer cover its total drops back to unpaid.
 */
export async function deletePayment(
  userId: string,
  invoiceId: string,
  paymentId: string,
  db: PrismaClient = getPrisma(),
): Promise<boolean> {
  const payment = await db.payment.findFirst({ where: { id: paymentId, invoiceId, userId } });
  if (!payment) return false;
  const invoice = await db.invoice.findFirst({ where: { id: invoiceId, userId } });
  if (!invoice) return false;
  await db.payment.delete({ where: { id: paymentId } });
  const remainingRows = await db.payment.findMany({ where: { invoiceId, userId } });
  const remaining = remainingRows.map(toPayment);
  const updated = applyPaymentDeletion(toInvoice(invoice), remaining);
  if (updated.status !== invoice.status) {
    await db.invoice.update({ data: { status: updated.status }, where: { id: invoiceId } });
  }
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
  for (const [index, inv] of seed.invoices.entries()) {
    const clientId = idMap.get(inv.clientId);
    if (!clientId) continue;
    const created = await db.invoice.create({
      data: {
        amount: inv.amount,
        clientId,
        description: inv.description,
        discountRate: inv.discountRate,
        dueDate: inv.dueDate,
        issuedDate: inv.issuedDate,
        number: index + 1,
        status: inv.status,
        taxRate: inv.taxRate,
        userId,
      },
    });
    // A seeded invoice marked paid must have the payment row to back
    // it up: the dashboard totals count real payments, so without this
    // row a fresh account would show $0 paid and the paid invoices
    // counted as outstanding. The payment is dated at issue, so the
    // monthly trend (which groups by issued date) is unchanged.
    if (inv.status === "paid") {
      await db.payment.create({
        data: {
          amount: computeInvoiceTotal(inv),
          invoiceId: created.id,
          paidAt: inv.issuedDate,
          userId,
        },
      });
    }
  }
}

export async function resetDemoForUser(userId: string, db: PrismaClient = getPrisma()): Promise<void> {
  // All or nothing: a failed reseed must not leave the user with nothing.
  // The transaction client has the same delegate methods as PrismaClient.
  await db.$transaction(async (tx) => {
    await tx.invoice.deleteMany({ where: { userId } });
    await tx.client.deleteMany({ where: { userId } });
    await seedDemoForUser(userId, tx as unknown as PrismaClient);
  });
}
