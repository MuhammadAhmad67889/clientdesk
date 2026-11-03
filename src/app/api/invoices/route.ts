import { NextRequest, NextResponse } from "next/server";
import { createInvoice, getSessionUser, getUsage, listInvoices } from "../../../lib/data";
import { freeLimitMessage, planAllowsCreate } from "../../../lib/plans";
import { computeItemsSubtotal, parseInvoiceItems, validateInvoiceItems } from "../../../lib/invoices";
import { validateInvoice } from "../../../lib/validation";

export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  return NextResponse.json(await listInvoices(user.id));
}

export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  const clientId = typeof body?.clientId === "string" ? body.clientId : "";
  const description = typeof body?.description === "string" ? body.description : "";
  const dueDate = typeof body?.dueDate === "string" ? body.dueDate : "";
  const items = body && "items" in body ? parseInvoiceItems(body.items) : undefined;
  if (items === null) {
    return NextResponse.json({ errors: { form: "Line items are invalid." } }, { status: 400 });
  }
  const itemsError = items ? validateInvoiceItems(items) : null;
  if (itemsError) {
    return NextResponse.json({ errors: { form: itemsError } }, { status: 400 });
  }
  // With line items, the amount is their subtotal; otherwise it is
  // the single amount from the form.
  const amount = items && items.length > 0 ? computeItemsSubtotal(items) : Number(body?.amount);
  const discountRate = body?.discountRate === "" || body?.discountRate === undefined ? 0 : Number(body?.discountRate);
  const taxRate = body?.taxRate === "" || body?.taxRate === undefined ? 0 : Number(body?.taxRate);
  const errors = validateInvoice({ amount, clientId, description, discountRate, dueDate, taxRate });
  if (Object.keys(errors).length > 0) return NextResponse.json({ errors }, { status: 400 });
  const usage = await getUsage(user.id);
  if (!planAllowsCreate(usage.plan, "invoice", usage.invoiceCount)) {
    return NextResponse.json({ errors: { form: freeLimitMessage("invoice") } }, { status: 403 });
  }
  const invoice = await createInvoice(user.id, {
    amount: Math.round(amount * 100) / 100,
    clientId,
    description: description.trim(),
    discountRate,
    dueDate,
    items,
    status: "unpaid",
    taxRate,
  });
  if (!invoice) return NextResponse.json({ error: "Client not found." }, { status: 404 });
  return NextResponse.json(invoice, { status: 201 });
}
