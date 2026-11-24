import { NextResponse } from "next/server";
import { generateOneRecurring, getSessionUser, getUsage } from "../../../../../lib/data";
import { freeLimitMessage, planAllowsCreate } from "../../../../../lib/plans";
import { todayIso } from "../../../../../lib/invoices";

/** Generate one invoice from one template right now, even when its
 * next due date has not arrived yet. The template advances one month,
 * so this can never make two invoices for the same period. */
export async function POST(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  const { id } = await ctx.params;
  const usage = await getUsage(user.id);
  if (!planAllowsCreate(usage.plan, "invoice", usage.invoiceCount)) {
    return NextResponse.json({ errors: { form: freeLimitMessage("invoice") } }, { status: 403 });
  }
  const invoice = await generateOneRecurring(user.id, id, todayIso());
  if (!invoice) return NextResponse.json({ error: "Recurring invoice not found." }, { status: 404 });
  return NextResponse.json(invoice, { status: 201 });
}
