import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { planFromSubscriptionStatus, stripeSecretKey, stripeWebhookSecret } from "../../../../lib/billing";
import { getPrisma } from "../../../../lib/prisma";

/** Stripe webhook. The signature check is the whole gate: without a
 * valid signature nothing here runs, so a forged event cannot grant
 * Pro. Only this route ever flips a user's plan. */
export async function POST(req: NextRequest) {
  const secret = stripeSecretKey();
  const webhookSecret = stripeWebhookSecret();
  if (!secret || !webhookSecret) {
    return NextResponse.json({ error: "Billing is not set up yet." }, { status: 503 });
  }
  const signature = req.headers.get("stripe-signature");
  if (!signature) return NextResponse.json({ error: "Missing signature." }, { status: 400 });

  const stripe = new Stripe(secret);
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(await req.text(), signature, webhookSecret);
  } catch {
    return NextResponse.json({ error: "Webhook signature verification failed." }, { status: 400 });
  }

  const db = getPrisma();

  // Checkout completed means Stripe has a subscription for this user:
  // that is the moment the account becomes Pro.
  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const userId = session.metadata?.userId;
    if (userId) {
      await db.user.update({
        data: {
          plan: "pro",
          stripeCustomerId: typeof session.customer === "string" ? session.customer : undefined,
          stripeSubscriptionId: typeof session.subscription === "string" ? session.subscription : undefined,
          subscriptionStatus: "active",
        },
        where: { id: userId },
      });
    }
  } else if (
    event.type === "customer.subscription.created" ||
    event.type === "customer.subscription.updated"
  ) {
    // Any status change on Stripe's side is followed, not second-
    // guessed: active/trialing/past_due stay Pro, the rest drop to Free.
    const sub = event.data.object as Stripe.Subscription;
    const user = await findUserForSubscription(db, sub);
    if (user) {
      await db.user.update({
        data: {
          plan: planFromSubscriptionStatus(sub.status),
          stripeSubscriptionId: sub.id,
          subscriptionStatus: sub.status,
        },
        where: { id: user.id },
      });
    }
  } else if (event.type === "customer.subscription.deleted") {
    // The subscription ended. Downgrade only: nothing is deleted, and
    // the free limits apply again from here.
    const sub = event.data.object as Stripe.Subscription;
    const user = await findUserForSubscription(db, sub);
    if (user) {
      await db.user.update({
        data: { plan: "free", subscriptionStatus: "canceled" },
        where: { id: user.id },
      });
    }
  }

  return NextResponse.json({ received: true });
}

/** Find the account behind a Stripe subscription, by customer first
 * and by subscription id as a fallback. */
async function findUserForSubscription(
  db: ReturnType<typeof getPrisma>,
  sub: Stripe.Subscription,
) {
  const customerId = typeof sub.customer === "string" ? sub.customer : null;
  if (customerId) return db.user.findUnique({ where: { stripeCustomerId: customerId } });
  return db.user.findFirst({ where: { stripeSubscriptionId: sub.id } });
}
