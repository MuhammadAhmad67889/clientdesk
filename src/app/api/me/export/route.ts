import { NextResponse } from "next/server";
import {
  getSessionUser,
  listClients,
  listInvoices,
  listPayments,
  listRecurringTemplates,
} from "../../../../lib/data";
import { buildUserExport } from "../../../../lib/exportData";

/** Download everything the signed-in user owns, as one JSON file.
 * Sessions, password hashes and reset tokens are never included —
 * the export builder only receives the four business lists. */
export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  const [clients, invoices, payments, recurringTemplates] = await Promise.all([
    listClients(user.id),
    listInvoices(user.id),
    listPayments(user.id),
    listRecurringTemplates(user.id),
  ]);
  const data = buildUserExport({ clients, email: user.email, invoices, payments, recurringTemplates });
  return new NextResponse(JSON.stringify(data, null, 2), {
    headers: {
      "Content-Disposition": 'attachment; filename="clientdesk-export.json"',
      "Content-Type": "application/json",
    },
  });
}
