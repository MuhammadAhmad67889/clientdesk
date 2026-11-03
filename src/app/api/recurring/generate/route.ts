import { NextResponse } from "next/server";
import { generateDueRecurring, getSessionUser, getUsage, listRecurringTemplates } from "../../../../lib/data";
import { dueTemplates } from "../../../../lib/recurring";
import { freeLimitMessage, planAllowsCreate } from "../../../../lib/plans";
import { todayIso } from "../../../../lib/invoices";

export async function POST() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  // No partial generation past the limit: a free user at the cap gets a
  // clear message instead of some templates generating and others not.
  const usage = await getUsage(user.id);
  const dueCount = dueTemplates(await listRecurringTemplates(user.id), todayIso()).length;
  if (dueCount > 0 && !planAllowsCreate(usage.plan, "invoice", usage.invoiceCount + dueCount - 1)) {
    return NextResponse.json({ errors: { form: freeLimitMessage("invoice") } }, { status: 403 });
  }
  const created = await generateDueRecurring(user.id, todayIso());
  return NextResponse.json({ created: created.length, invoices: created });
}
