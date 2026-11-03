import { NextRequest, NextResponse } from "next/server";
import { getSessionUser, updateBusinessName } from "../../../lib/data";

export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ email: null }, { status: 401 });
  return NextResponse.json({ email: user.email });
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
