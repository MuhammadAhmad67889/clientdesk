import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import Reveal from "../../../components/Reveal";
import InvoiceDetailActions from "../../../components/InvoiceDetailActions";
import { StatusBadge } from "../../../components/ui";
import { getSessionUser, listClients, listInvoices } from "../../../lib/data";
import { formatMoney, isOverdue, todayIso } from "../../../lib/invoices";

export const dynamic = "force-dynamic";

export default async function InvoiceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  const { id } = await params;
  const [clients, invoices] = await Promise.all([listClients(user.id), listInvoices(user.id)]);
  const invoice = invoices.find((i) => i.id === id);
  if (!invoice) notFound();
  const client = clients.find((c) => c.id === invoice.clientId);
  const today = todayIso();

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
        <p>Description: {invoice.description}</p>
        <p>Amount due: <strong>{formatMoney(invoice.amount)}</strong></p>
        <p style={{ marginBottom: 0 }}>
          Status: {isOverdue(invoice, today) ? "Overdue — unpaid and past its due date." : invoice.status === "paid" ? "Paid." : "Unpaid."}
        </p>
        <p className="hint no-print" style={{ marginTop: 16 }}>
          “Print / save as PDF” uses your browser print dialog — choose “Save as PDF” there.
          No PDF is generated on the server.
        </p>
      </div>
    </Reveal>
  );
}
