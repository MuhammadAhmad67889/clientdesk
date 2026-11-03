import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { getSessionUser } from "../../../../lib/data";
import { getPrisma } from "../../../../lib/prisma";
import { stripeSecretKey } from "../../../../lib/billing";

/** Open Stripe's customer portal, where the user manages or cancels
 * their subscription. Cancellation happens in Stripe, and the webhook
 * is what downgrades the account — this route never edits the plan. */
export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  const secret = stripeSecretKey();
  if (!secret) return NextResponse.json({ error: "Billing is not set up yet." }, { status: 503 });

  const db = getPrisma();
  const existing = await db.user.findUnique({ where: { id: user.id } });
  if (!existing?.stripeCustomerId) {
    return NextResponse.json({ error: "No billing account yet. Upgrade to Pro first." }, { status: 400 });
  }

  const stripe = new Stripe(secret);
  try {
    const session = await stripe.billingPortal.sessions.create({
      customer: existing.stripeCustomerId,
      return_url: `${req.nextUrl.origin}/settings`,
    });
    return NextResponse.json({ url: session.url });
  } catch (err) {
    const message = err instanceof Error ? err.message : "";
    if (message.toLowerCase().includes("configuration")) {
      return NextResponse.json({ error: "The billing portal is not configured in Stripe yet." }, { status: 500 });
    }
    return NextResponse.json({ error: "Could not open the billing portal." }, { status: 500 });
  }
}
