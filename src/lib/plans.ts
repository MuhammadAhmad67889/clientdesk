/** Free-plan limits and the one rule that enforces them.
 *
 * Signup seeds 3 demo clients and 5 demo invoices, and demo rows count
 * toward these limits — so the free tier is set with room for them.
 * Pro and Business are unlimited; their billing is not live yet, so
 * every account is free until Phase 2 turns billing on.
 */

export const FREE_CLIENT_LIMIT = 10;
export const FREE_INVOICE_LIMIT = 30;

export type Plan = "free" | "pro" | "business";

export function normalizePlan(plan: string | null | undefined): Plan {
  if (plan === "pro" || plan === "business") return plan;
  return "free";
}

/** True when a user on this plan may create one more row of this kind. */
export function planAllowsCreate(
  plan: string | null | undefined,
  kind: "client" | "invoice",
  currentCount: number,
): boolean {
  if (normalizePlan(plan) !== "free") return true;
  const limit = kind === "client" ? FREE_CLIENT_LIMIT : FREE_INVOICE_LIMIT;
  return currentCount < limit;
}

export function freeLimitMessage(kind: "client" | "invoice"): string {
  const limit = kind === "client" ? FREE_CLIENT_LIMIT : FREE_INVOICE_LIMIT;
  const noun = kind === "client" ? "clients" : "invoices";
  return `Free plan allows up to ${limit} ${noun}. Your demo data counts toward that limit — delete demo rows or upgrade to Pro when billing opens.`;
}
