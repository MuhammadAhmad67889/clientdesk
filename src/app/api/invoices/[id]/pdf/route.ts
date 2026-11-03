import { NextRequest, NextResponse } from "next/server";
import { getSessionUser, listClients, listInvoices, listPaymentsForInvoice } from "../../../../../lib/data";
import { isOverdue, todayIso } from "../../../../../lib/invoices";
import { buildInvoicePdf } from "../../../../../lib/invoicePdf";

export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  const { id } = await ctx.params;
  // Scoped to this user's invoices, so another user's invoice id 404s here.
  const invoices = await listInvoices(user.id);
  const invoice = invoices.find((i) => i.id === id);
  if (!invoice) return NextResponse.json({ error: "Invoice not found." }, { status: 404 });
  const clients = await listClients(user.id);
  const client = clients.find((c) => c.id === invoice.clientId);
  const payments = await listPaymentsForInvoice(user.id, id);
  const today = todayIso();
  const statusLabel = isOverdue(invoice, today)
    ? "Overdue — unpaid and past its due date"
    : invoice.status === "paid"
      ? "Paid"
      : "Unpaid";
  const pdf = await buildInvoicePdf(invoice, client, statusLabel, user.businessName, payments);
  return new NextResponse(Buffer.from(pdf), {
    headers: {
      "Content-Disposition": `attachment; filename="invoice-${invoice.id}.pdf"`,
      "Content-Type": "application/pdf",
    },
  });
}
