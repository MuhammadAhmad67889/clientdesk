import { NextRequest, NextResponse } from "next/server";
import { getSessionUser, listInvoices, listPaymentsForInvoice, recordPayment } from "../../../../../lib/data";
import { computeRemainingBalance, todayIso } from "../../../../../lib/invoices";
import { validatePayment } from "../../../../../lib/validation";

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  const { id } = await ctx.params;
  const invoices = await listInvoices(user.id);
  const invoice = invoices.find((i) => i.id === id);
  if (!invoice) return NextResponse.json({ error: "Invoice not found." }, { status: 404 });
  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  const amount = Number(body?.amount);
  const paidAt = typeof body?.paidAt === "string" && body.paidAt ? body.paidAt : todayIso();
  const payments = await listPaymentsForInvoice(user.id, id);
  const balance = computeRemainingBalance(invoice, payments);
  const errors = validatePayment({ amount, balance, paidAt });
  if (Object.keys(errors).length > 0) return NextResponse.json({ errors }, { status: 400 });
  const payment = await recordPayment(user.id, id, { amount: Math.round(amount * 100) / 100, paidAt });
  if (!payment) return NextResponse.json({ error: "Payment could not be recorded." }, { status: 400 });
  return NextResponse.json(payment, { status: 201 });
}
