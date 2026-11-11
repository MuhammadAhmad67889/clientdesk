import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "../../../../lib/data";
import { deleteWebhookSubscription } from "../../../../lib/webhooks";

export async function DELETE(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  const { id } = await ctx.params;
  const deleted = await deleteWebhookSubscription(user.id, id);
  if (!deleted) return NextResponse.json({ error: "Webhook not found." }, { status: 404 });
  return NextResponse.json({ ok: true });
}
