import { NextRequest, NextResponse } from "next/server";
import { duplicateInvoice, getSessionUser, getUsage } from "../../../../../lib/data";
import { freeLimitMessage, planAllowsCreate } from "../../../../../lib/plans";

export async function POST(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  const { id } = await ctx.params;
  const usage = await getUsage(user.id);
  if (!planAllowsCreate(usage.plan, "invoice", usage.invoiceCount)) {
    return NextResponse.json({ errors: { form: freeLimitMessage("invoice") } }, { status: 403 });
  }
  const copy = await duplicateInvoice(user.id, id);
  if (!copy) return NextResponse.json({ error: "Invoice not found." }, { status: 404 });
  return NextResponse.json(copy, { status: 201 });
}
