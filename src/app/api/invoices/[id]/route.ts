import { NextRequest, NextResponse } from "next/server";
import { deleteInvoice, getSessionUser, listInvoices, setInvoicePaid, updateInvoice } from "../../../../lib/data";
import { computeItemsSubtotal, parseInvoiceItems, validateInvoiceItems } from "../../../../lib/invoices";
import { validateInvoice } from "../../../../lib/validation";

export async function PUT(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  const { id } = await ctx.params;
  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  // Paid toggle (existing behaviour) when the body only carries `paid`.
  if (body && "paid" in body && !("amount" in body)) {
    const updated = await setInvoicePaid(user.id, id, body.paid === true);
    if (!updated) return NextResponse.json({ error: "Invoice not found." }, { status: 404 });
    return NextResponse.json(updated);
  }
  const invoices = await listInvoices(user.id);
  const invoice = invoices.find((i) => i.id === id);
  if (!invoice) return NextResponse.json({ error: "Invoice not found." }, { status: 404 });
  const items = body && "items" in body ? parseInvoiceItems(body.items) : undefined;
  if (items === null) {
    return NextResponse.json({ errors: { form: "Line items are invalid." } }, { status: 400 });
  }
  const itemsError = items ? validateInvoiceItems(items) : null;
  if (itemsError) {
    return NextResponse.json({ errors: { form: itemsError } }, { status: 400 });
  }
  const amount = items && items.length > 0 ? computeItemsSubtotal(items) : Number(body?.amount);
  const input = {
    amount,
    clientId: invoice.clientId,
    description: typeof body?.description === "string" ? body.description : "",
    discountRate: Number(body?.discountRate ?? 0),
    dueDate: typeof body?.dueDate === "string" ? body.dueDate : "",
    taxRate: Number(body?.taxRate ?? 0),
  };
  const errors = validateInvoice(input);
  if (Object.keys(errors).length > 0) return NextResponse.json({ errors }, { status: 400 });
  const updated = await updateInvoice(user.id, id, {
    amount: Math.round(input.amount * 100) / 100,
    description: input.description.trim(),
    discountRate: input.discountRate,
    dueDate: input.dueDate,
    items,
    taxRate: input.taxRate,
  });
  if (!updated) return NextResponse.json({ error: "Invoice not found." }, { status: 404 });
  return NextResponse.json(updated);
}

export async function DELETE(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  const { id } = await ctx.params;
  const ok = await deleteInvoice(user.id, id);
  if (!ok) return NextResponse.json({ error: "Invoice not found." }, { status: 404 });
  return NextResponse.json({ ok: true });
}
