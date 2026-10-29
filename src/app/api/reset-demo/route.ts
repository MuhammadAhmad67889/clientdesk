import { NextResponse } from "next/server";
import { getSessionUser, resetDemoForUser } from "../../../lib/data";

export async function POST() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  await resetDemoForUser(user.id);
  return NextResponse.json({ ok: true });
}
