/** Stripe billing, test mode only.
 *
 * Nothing here touches live payments: the code runs against whatever
 * keys are in the environment, and the SaaS plan keeps live keys behind
 * a separate explicit decision. Until STRIPE_SECRET_KEY and
 * STRIPE_PRO_PRICE_ID exist, checkout and the webhook answer 503 and
 * the Settings billing section says billing is not set up yet.
 *
 * The plan field on the user is the only thing that gates limits, and
 * only the webhook flips it. Checkout and portal routes never write a
 * plan directly — that way a failed or forged request cannot grant Pro.
 */

/** Subscription statuses that keep Pro. past_due stays Pro during
 * Stripe's retry window; the subscription.deleted event is what ends
 * it, not a single failed payment. */
export function planFromSubscriptionStatus(status: string | null | undefined): "free" | "pro" {
  if (status === "active" || status === "trialing" || status === "past_due") return "pro";
  return "free";
}

/** Server-only env check. Never expose the result's inputs — callers
 * pass only this boolean to the client. */
export function isBillingConfigured(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY) && Boolean(process.env.STRIPE_PRO_PRICE_ID);
}

export function stripeSecretKey(): string | null {
  return process.env.STRIPE_SECRET_KEY ?? null;
}

export function stripeWebhookSecret(): string | null {
  return process.env.STRIPE_WEBHOOK_SECRET ?? null;
}

export function stripeProPriceId(): string | null {
  return process.env.STRIPE_PRO_PRICE_ID ?? null;
}
