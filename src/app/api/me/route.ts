import { NextRequest, NextResponse } from "next/server";
import { getSessionUser, updateBusinessName } from "../../../lib/data";
import { getPrisma } from "../../../lib/prisma";
import { clearSessionCookie } from "../../../lib/session-cookie";

export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ email: null }, { status: 401 });
  return NextResponse.json({ email: user.email, plan: user.plan });
}

export async function PUT(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  const body = (await req.json().catch(() => null)) as { businessName?: unknown } | null;
  const businessName = typeof body?.businessName === "string" ? body.businessName.trim() : "";
  if (businessName.length > 100) {
    return NextResponse.json({ error: "Business name must be 100 characters or fewer." }, { status: 400 });
  }
  await updateBusinessName(user.id, businessName);
  return NextResponse.json({ businessName: businessName || null });
}

/** Delete the signed-in account and everything it owns. The caller
 * must type their own email address: that confirmation works for
 * password accounts and OAuth-only accounts alike, and it stops an
 * accidental click from wiping an account. Cascade removes the
 * user's sessions, clients, invoices, payments, recurring templates
 * and audit entries with the row itself. A live Stripe subscription
 * is not cancelled here — billing is env-gated and no Stripe keys
 * are configured in this build. */
export async function DELETE(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  const body = (await req.json().catch(() => null)) as { confirmation?: unknown } | null;
  const confirmation = typeof body?.confirmation === "string" ? body.confirmation.trim() : "";
  if (confirmation !== user.email) {
    return NextResponse.json({ error: "Type your email address to confirm deletion." }, { status: 400 });
  }
  await getPrisma().user.delete({ where: { id: user.id } });
  const res = NextResponse.json({ ok: true });
  clearSessionCookie(res);
  return res;
}
