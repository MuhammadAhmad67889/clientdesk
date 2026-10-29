import { NextRequest, NextResponse } from "next/server";
import { createInvoice, getSessionUser, listInvoices } from "../../../lib/data";
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
  const amount = Number(body?.amount);
  const errors = validateInvoice({ amount, clientId, description, dueDate });
  if (Object.keys(errors).length > 0) return NextResponse.json({ errors }, { status: 400 });
  const invoice = await createInvoice(user.id, {
    amount: Math.round(amount * 100) / 100,
    clientId,
    description: description.trim(),
    dueDate,
    status: "unpaid",
  });
  if (!invoice) return NextResponse.json({ error: "Client not found." }, { status: 404 });
  return NextResponse.json(invoice, { status: 201 });
}
