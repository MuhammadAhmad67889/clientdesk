import { NextRequest, NextResponse } from "next/server";
import { deleteClient, getSessionUser, updateClient } from "../../../../lib/data";
import { validateClient } from "../../../../lib/validation";

export async function PUT(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  const { id } = await ctx.params;
  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  const name = typeof body?.name === "string" ? body.name : "";
  const email = typeof body?.email === "string" ? body.email : undefined;
  const company = typeof body?.company === "string" ? body.company : undefined;
  const phone = typeof body?.phone === "string" ? body.phone : undefined;
  const notes = typeof body?.notes === "string" ? body.notes : undefined;
  const errors = validateClient({ email, name });
  if (Object.keys(errors).length > 0) return NextResponse.json({ errors }, { status: 400 });
  const updated = await updateClient(user.id, id, {
    company: company?.trim() || undefined,
    email: email?.trim() || undefined,
    name: name.trim(),
    notes: notes?.trim() || undefined,
    phone: phone?.trim() || undefined,
  });
  if (!updated) return NextResponse.json({ error: "Client not found." }, { status: 404 });
  return NextResponse.json(updated);
}

export async function DELETE(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  const { id } = await ctx.params;
  const ok = await deleteClient(user.id, id);
  if (!ok) return NextResponse.json({ error: "Client not found." }, { status: 404 });
  return NextResponse.json({ ok: true });
}
