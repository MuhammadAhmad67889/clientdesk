import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "../../../../../lib/data";
import { deliverWebhook, getWebhookSubscription, WEBHOOK_EVENTS, type WebhookEvent } from "../../../../../lib/webhooks";

/** Clearly labelled test data, so a test payload can never be
 * mistaken for a real client, invoice, or payment in Zapier. */
function sampleData(event: WebhookEvent): Record<string, unknown> {
  const client = { company: "Test Company", email: "test@example.com", id: "test-client", name: "Test Client" };
  if (event === "client.created") return { client };
  if (event === "payment.recorded") {
    return {
      invoice: { description: "Test invoice from ClientDesk", id: "test-invoice", number: 1, status: "paid", total: 100 },
      payment: { amount: 100, id: "test-payment", method: "Bank transfer", paidAt: "2026-11-10", reference: "TEST-001" },
    };
  }
  return {
    client,
    invoice: {
      amount: 100,
      description: "Test invoice from ClientDesk",
      dueDate: "2026-12-01",
      id: "test-invoice",
      issuedDate: "2026-11-10",
      number: 1,
      status: event === "invoice.paid" ? "paid" : "unpaid",
      total: 100,
    },
  };
}

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  const { id } = await ctx.params;
  const subscription = await getWebhookSubscription(user.id, id);
  if (!subscription) return NextResponse.json({ error: "Webhook not found." }, { status: 404 });
  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  const event = typeof body?.event === "string" ? body.event : "invoice.created";
  if (!(WEBHOOK_EVENTS as readonly string[]).includes(event)) {
    return NextResponse.json({ error: "That event is not one ClientDesk can send." }, { status: 400 });
  }
  const result = await deliverWebhook(subscription, event as WebhookEvent, sampleData(event as WebhookEvent));
  return NextResponse.json(result);
}
