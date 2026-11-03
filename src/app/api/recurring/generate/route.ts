import { NextResponse } from "next/server";
import { generateDueRecurring, getSessionUser } from "../../../../lib/data";
import { todayIso } from "../../../../lib/invoices";

export async function POST() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  const created = await generateDueRecurring(user.id, todayIso());
  return NextResponse.json({ created: created.length, invoices: created });
}
