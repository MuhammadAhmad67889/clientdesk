import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import Reveal from "../../../components/Reveal";
import InvoiceDetailActions from "../../../components/InvoiceDetailActions";
import RecordPaymentForm from "../../../components/RecordPaymentForm";
import { StatusBadge } from "../../../components/ui";
import { getSessionUser, listClients, listInvoices, listPaymentsForInvoice } from "../../../lib/data";
import { computeAmountPaid, computeInvoiceTotal, computeRemainingBalance, formatInvoiceNumber, formatMoney, isOverdue, todayIso } from "../../../lib/invoices";

export const dynamic = "force-dynamic";

export default async function InvoiceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  const { id } = await params;
  const [clients, invoices] = await Promise.all([listClients(user.id), listInvoices(user.id)]);
  const invoice = invoices.find((i) => i.id === id);
  if (!invoice) notFound();
  const payments = await listPaymentsForInvoice(user.id, id);
  const client = clients.find((c) => c.id === invoice.clientId);
  const today = todayIso();
  const paid = computeAmountPaid(payments);
  const balance = computeRemainingBalance(invoice, payments);

  return (
    <Reveal>
      <div className="page-head">
        <p style={{ margin: 0 }}><Link href="/invoices">← All invoices</Link></p>
        <h1 style={{ marginTop: 8 }}>{invoice.description}</h1>
        <p className="lead">
          For {client ? <Link href={`/clients/${client.id}`}>{client.name}</Link> : "Unknown client"} · Issued {invoice.issuedDate} · Due {invoice.dueDate}
        </p>
        <InvoiceDetailActions invoice={invoice} />
      </div>
      <div className="card invoice-sheet">
        <div className="card-head">
          <h2>Invoice</h2>
          <StatusBadge status={isOverdue(invoice, today) ? "overdue" : invoice.status} />
        </div>
        <p>Client: <strong>{client?.name ?? "Unknown client"}</strong>{client?.company ? ` — ${client.company}` : ""}</p>
        <p>Invoice number: <strong>{formatInvoiceNumber(invoice.number)}</strong></p>
        {user.businessName && <p>From: {user.businessName}</p>}
        <p>Description: {invoice.description}</p>
        <p>Amount: <strong>{formatMoney(invoice.amount)}</strong></p>
        {invoice.discountRate > 0 && <p>Discount: {invoice.discountRate}%</p>}
        {invoice.taxRate > 0 && <p>Tax: {invoice.taxRate}% (on the discounted amount)</p>}
        <p>Total due: <strong>{formatMoney(computeInvoiceTotal(invoice))}</strong></p>
        <p>Paid so far: <strong>{formatMoney(paid)}</strong></p>
        <p>Remaining balance: <strong>{formatMoney(balance)}</strong></p>
        <p style={{ marginBottom: 0 }}>
          Status: {isOverdue(invoice, today) ? "Overdue — unpaid and past its due date." : invoice.status === "paid" ? "Paid." : "Unpaid."}
        </p>
        <p className="hint no-print" style={{ marginTop: 16 }}>
          “Download PDF” generates a real PDF on the server for this invoice.
          “Print / save as PDF” uses your browser print dialog instead.
        </p>
      </div>
      <div className="card" data-reveal>
        <h2 style={{ marginTop: 0 }}>Payments</h2>
        {payments.length === 0 ? (
          <p className="hint" style={{ margin: 0 }}>No payments recorded yet.</p>
        ) : (
          <ul style={{ margin: "0 0 16px", paddingLeft: 20 }}>
            {payments.map((p) => (
              <li key={p.id}>{p.paidAt} — {formatMoney(p.amount)}</li>
            ))}
          </ul>
        )}
        <RecordPaymentForm balance={balance} invoiceId={invoice.id} />
      </div>
    </Reveal>
  );
}
