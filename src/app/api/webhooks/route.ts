import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "../../../lib/data";
import { createWebhookSubscription, listWebhookSubscriptions } from "../../../lib/webhooks";

export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  // Secrets are never listed: a subscription's secret is only
  // shown once, in the response that creates it.
  return NextResponse.json(await listWebhookSubscriptions(user.id));
}

export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  try {
    const subscription = await createWebhookSubscription(user.id, {
      events: body?.events,
      url: body?.url,
    });
    return NextResponse.json(subscription, { status: 201 });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Could not add the webhook.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
