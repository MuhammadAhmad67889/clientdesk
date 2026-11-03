import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { getSessionUser } from "../../../../lib/data";
import { getPrisma } from "../../../../lib/prisma";
import { isBillingConfigured, stripeProPriceId, stripeSecretKey } from "../../../../lib/billing";

/** Start a Pro subscription checkout. Server-side only: no Stripe key
 * ever reaches the browser. This route never grants Pro itself — the
 * webhook does that after Stripe confirms the subscription. */
export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  if (!isBillingConfigured()) {
    return NextResponse.json({ error: "Billing is not set up yet." }, { status: 503 });
  }
  if (user.plan === "pro" || user.plan === "business") {
    return NextResponse.json({ error: "Already on a paid plan." }, { status: 400 });
  }

  const stripe = new Stripe(stripeSecretKey()!);
  const db = getPrisma();
  let customerId: string | null = null;
  const existing = await db.user.findUnique({ where: { id: user.id } });
  customerId = existing?.stripeCustomerId ?? null;
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: user.email,
      metadata: { userId: user.id },
    });
    customerId = customer.id;
    await db.user.update({ data: { stripeCustomerId: customerId }, where: { id: user.id } });
  }

  const session = await stripe.checkout.sessions.create({
    cancel_url: `${req.nextUrl.origin}/pricing`,
    customer: customerId,
    line_items: [{ price: stripeProPriceId()!, quantity: 1 }],
    metadata: { userId: user.id },
    mode: "subscription",
    success_url: `${req.nextUrl.origin}/billing/success`,
  });
  if (!session.url) return NextResponse.json({ error: "Could not start checkout." }, { status: 500 });
  return NextResponse.json({ url: session.url });
}
