import { NextRequest, NextResponse } from "next/server";
import { deleteRecurringTemplate, getSessionUser } from "../../../../lib/data";

export async function DELETE(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  const { id } = await ctx.params;
  const ok = await deleteRecurringTemplate(user.id, id);
  if (!ok) return NextResponse.json({ error: "Recurring invoice not found." }, { status: 404 });
  return NextResponse.json({ ok: true });
}
