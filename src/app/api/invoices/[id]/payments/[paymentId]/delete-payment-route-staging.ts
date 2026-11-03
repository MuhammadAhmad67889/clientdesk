import { NextRequest, NextResponse } from "next/server";
import { deletePayment, getSessionUser } from "../../../../../../lib/data";

export async function DELETE(_req: NextRequest, ctx: { params: Promise<{ id: string; paymentId: string }> }) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  const { id, paymentId } = await ctx.params;
  const ok = await deletePayment(user.id, id, paymentId);
  if (!ok) return NextResponse.json({ error: "Payment not found." }, { status: 404 });
  return NextResponse.json({ ok: true });
}
