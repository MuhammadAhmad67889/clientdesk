import { createHmac, randomBytes } from "node:crypto";
import type { PrismaClient } from "@prisma/client";
import { WEBHOOK_EVENTS, type WebhookEvent } from "./webhook-events";
import { computeInvoiceTotal } from "./invoices";
import { getPrisma } from "./prisma";
import type { Client, Invoice, Payment } from "./types";

/** Re-exported so callers only need to import from "./webhooks". */
export { WEBHOOK_EVENTS, type WebhookEvent } from "./webhook-events";

/** A subscription as the API and Settings page see it — no secret. */
export interface WebhookSubscriptionInfo {
  active: boolean;
  createdAt: string;
  events: WebhookEvent[];
  id: string;
  url: string;
}

/** A subscription with its secret, shown once when it is created. */
export interface WebhookSubscriptionWithSecret extends WebhookSubscriptionInfo {
  secret: string;
}

/** The smallest shape deliverWebhook needs: a URL and its secret. */
export interface WebhookDeliveryTarget {
  secret: string;
  url: string;
}

type WebhookRow = {
  active: boolean;
  createdAt: Date;
  events: string[];
  id: string;
  secret: string;
  url: string;
  userId: string;
};

function toInfo(row: WebhookRow): WebhookSubscriptionInfo {
  return {
    active: row.active,
    createdAt: row.createdAt.toISOString().slice(0, 10),
    events: row.events.filter((e): e is WebhookEvent => (WEBHOOK_EVENTS as readonly string[]).includes(e)),
    id: row.id,
    url: row.url,
  };
}

/** Plain error for a bad webhook URL, or null when it is fine.
 * Only https URLs are accepted: a webhook carries real client
 * and invoice data, so it must never go over plain http. */
export function webhookUrlError(url: unknown): string | null {
  if (typeof url !== "string" || url.length === 0) return "Add a webhook URL.";
  if (url.length > 2048) return "The webhook URL is too long.";
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return "That webhook URL is not valid.";
  }
  if (parsed.protocol !== "https:") return "The webhook URL must start with https://";
  return null;
}

/** The validated events, deduplicated in the order given, or null
 * when the value is empty or holds an event ClientDesk does not send. */
export function parseWebhookEvents(value: unknown): WebhookEvent[] | null {
  if (!Array.isArray(value) || value.length === 0) return null;
  const events: WebhookEvent[] = [];
  for (const item of value) {
    if (typeof item !== "string" || !(WEBHOOK_EVENTS as readonly string[]).includes(item)) return null;
    const event = item as WebhookEvent;
    if (!events.includes(event)) events.push(event);
  }
  return events;
}

/** One payload, the same shape for every event: the event name,
 * when it happened, and the data for that event. */
export function buildWebhookPayload(event: WebhookEvent, data: Record<string, unknown>): {
  data: Record<string, unknown>;
  event: WebhookEvent;
  occurredAt: string;
} {
  return { data, event, occurredAt: new Date().toISOString() };
}

/** HMAC-SHA256 of the raw request body, as hex. The receiver
 * recomputes this with the shared secret and compares it with
 * the X-ClientDesk-Signature header. */
export function signWebhookPayload(secret: string, bodyString: string): string {
  return createHmac("sha256", secret).update(bodyString).digest("hex");
}

/** The data for a client.created payload. */
export function webhookClientData(client: Pick<Client, "email" | "company" | "id" | "name">): Record<string, unknown> {
  return {
    client: {
      company: client.company ?? undefined,
      email: client.email ?? undefined,
      id: client.id,
      name: client.name,
    },
  };
}

function invoiceShape(invoice: Invoice): Record<string, unknown> {
  return {
    amount: invoice.amount,
    description: invoice.description,
    dueDate: invoice.dueDate,
    id: invoice.id,
    issuedDate: invoice.issuedDate,
    number: invoice.number,
    status: invoice.status,
    total: computeInvoiceTotal(invoice),
  };
}

/** The data for invoice.created / invoice.paid payloads. The total
 * uses the same discount-first-then-tax maths as the invoice itself. */
export function webhookInvoiceData(
  invoice: Invoice,
  client: Pick<Client, "email" | "id" | "name">,
): Record<string, unknown> {
  return {
    client: { email: client.email ?? undefined, id: client.id, name: client.name },
    invoice: invoiceShape(invoice),
  };
}

/** The data for a payment.recorded payload. */
export function webhookPaymentData(payment: Payment, invoice: Invoice): Record<string, unknown> {
  return {
    invoice: {
      description: invoice.description,
      id: invoice.id,
      number: invoice.number,
      status: invoice.status,
      total: computeInvoiceTotal(invoice),
    },
    payment: {
      amount: payment.amount,
      id: payment.id,
      method: payment.method ?? undefined,
      paidAt: payment.paidAt,
      reference: payment.reference ?? undefined,
    },
  };
}

/** The user's subscriptions, newest first, without their secrets. */
export async function listWebhookSubscriptions(
  userId: string,
  db: PrismaClient = getPrisma(),
): Promise<WebhookSubscriptionInfo[]> {
  const rows = await db.webhookSubscription.findMany({
    orderBy: { createdAt: "desc" },
    where: { userId },
  });
  return rows.map(toInfo);
}

/** One subscription, with its secret, or null when it is not theirs. */
export async function getWebhookSubscription(
  userId: string,
  id: string,
  db: PrismaClient = getPrisma(),
): Promise<WebhookSubscriptionWithSecret | null> {
  const row = await db.webhookSubscription.findFirst({ where: { id, userId } });
  if (!row) return null;
  return { ...toInfo(row), secret: row.secret };
}

/** Create a subscription. The secret is a fresh 32-byte hex string,
 * generated here so it is never chosen — or seen — by the caller. */
export async function createWebhookSubscription(
  userId: string,
  input: { events: unknown; url: unknown },
  db: PrismaClient = getPrisma(),
): Promise<WebhookSubscriptionWithSecret> {
  const urlError = webhookUrlError(input.url);
  if (urlError) throw new Error(urlError);
  const events = parseWebhookEvents(input.events);
  if (!events) throw new Error("Pick at least one event ClientDesk can send.");
  const secret = randomBytes(32).toString("hex");
  const row = await db.webhookSubscription.create({
    data: { active: true, events, secret, url: input.url as string, userId },
  });
  return { ...toInfo(row), secret };
}

/** Delete a subscription. False when it was not theirs to delete. */
export async function deleteWebhookSubscription(
  userId: string,
  id: string,
  db: PrismaClient = getPrisma(),
): Promise<boolean> {
  const deleted = await db.webhookSubscription.deleteMany({ where: { id, userId } });
  return deleted.count > 0;
}

/** Post one payload to one URL. Never throws: a dead or slow
 * receiver must never break the ClientDesk change that fired it.
 * A non-2xx answer is reported, not thrown. */
export async function deliverWebhook(
  subscription: WebhookDeliveryTarget,
  event: WebhookEvent,
  data: Record<string, unknown>,
): Promise<{ ok: boolean; status: number }> {
  const body = JSON.stringify(buildWebhookPayload(event, data));
  try {
    const res = await fetch(subscription.url, {
      body,
      headers: {
        "Content-Type": "application/json",
        "X-ClientDesk-Event": event,
        "X-ClientDesk-Signature": signWebhookPayload(subscription.secret, body),
      },
      method: "POST",
      signal: AbortSignal.timeout(5000),
    });
    return { ok: res.ok, status: res.status };
  } catch {
    return { ok: false, status: 0 };
  }
}

/** Send an event to every active subscription of this user that
 * asked for it. Never throws, and a failure in one receiver
 * does not stop the others. */
export async function dispatchWebhooks(
  userId: string,
  event: WebhookEvent,
  data: Record<string, unknown>,
  db: PrismaClient = getPrisma(),
): Promise<void> {
  try {
    const rows = await db.webhookSubscription.findMany({
      where: { active: true, userId },
    });
    const matching = rows.filter((row) => row.active && row.events.includes(event));
    await Promise.allSettled(matching.map((row) => deliverWebhook(row, event, data)));
  } catch {
    // A webhook failure must never break the user's own change.
  }
}
