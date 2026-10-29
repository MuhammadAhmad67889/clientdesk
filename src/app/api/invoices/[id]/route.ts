import { NextRequest, NextResponse } from "next/server";
import { deleteInvoice, getSessionUser, setInvoicePaid } from "../../../../lib/data";

export async function PUT(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  const { id } = await ctx.params;
  const body = (await req.json().catch(() => null)) as { paid?: unknown } | null;
  const updated = await setInvoicePaid(user.id, id, body?.paid === true);
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
