import { NextRequest, NextResponse } from "next/server";
import { createRecurringTemplate, getSessionUser, listRecurringTemplates } from "../../../lib/data";
import { validateInvoice } from "../../../lib/validation";

export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  return NextResponse.json(await listRecurringTemplates(user.id));
}

export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  const clientId = typeof body?.clientId === "string" ? body.clientId : "";
  const description = typeof body?.description === "string" ? body.description : "";
  const nextDueDate = typeof body?.nextDueDate === "string" ? body.nextDueDate : "";
  const amount = Number(body?.amount);
  const discountRate = body?.discountRate === "" || body?.discountRate === undefined ? 0 : Number(body?.discountRate);
  const taxRate = body?.taxRate === "" || body?.taxRate === undefined ? 0 : Number(body?.taxRate);
  const errors = validateInvoice({ amount, clientId, description, discountRate, dueDate: nextDueDate, taxRate });
  if (Object.keys(errors).length > 0) return NextResponse.json({ errors }, { status: 400 });
  const template = await createRecurringTemplate(user.id, {
    amount: Math.round(amount * 100) / 100,
    clientId,
    description: description.trim(),
    discountRate,
    nextDueDate,
    taxRate,
  });
  if (!template) return NextResponse.json({ error: "Client not found." }, { status: 404 });
  return NextResponse.json(template, { status: 201 });
}
