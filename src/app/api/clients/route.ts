import { NextRequest, NextResponse } from "next/server";
import { createClient, getSessionUser, listClients } from "../../../lib/data";
import { validateClient } from "../../../lib/validation";

export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  return NextResponse.json(await listClients(user.id));
}

export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  const name = typeof body?.name === "string" ? body.name : "";
  const email = typeof body?.email === "string" ? body.email : undefined;
  const company = typeof body?.company === "string" ? body.company : undefined;
  const phone = typeof body?.phone === "string" ? body.phone : undefined;
  const errors = validateClient({ email, name });
  if (Object.keys(errors).length > 0) return NextResponse.json({ errors }, { status: 400 });
  const client = await createClient(user.id, {
    company: company?.trim() || undefined,
    email: email?.trim() || undefined,
    name: name.trim(),
    phone: phone?.trim() || undefined,
  });
  return NextResponse.json(client, { status: 201 });
}
