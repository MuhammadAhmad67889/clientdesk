import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import Reveal from "../../../components/Reveal";
import { StatusBadge } from "../../../components/ui";
import { getSessionUser, listClients, listInvoices } from "../../../lib/data";
import { computeTotals, formatMoney, isOverdue, todayIso } from "../../../lib/invoices";

export const dynamic = "force-dynamic";

export default async function ClientDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  const { id } = await params;
  const [clients, invoices] = await Promise.all([listClients(user.id), listInvoices(user.id)]);
  const client = clients.find((c) => c.id === id);
  if (!client) notFound();
  const mine = invoices.filter((i) => i.clientId === id);
  const today = todayIso();
  const totals = computeTotals(mine, [client], today);

  return (
    <Reveal>
      <div className="page-head">
        <p style={{ margin: 0 }}><Link href="/clients">← All clients</Link></p>
        <h1 style={{ marginTop: 8 }}>{client.name}</h1>
        <p className="lead">{client.company ?? "No company listed"} · Client since {client.createdAt}</p>
      </div>
      <div className="two-col">
        <div className="card">
          <h2>Contact</h2>
          <p>Email: {client.email ? <a href={`mailto:${client.email}`}>{client.email}</a> : "—"}</p>
          <p>Phone: {client.phone ?? "—"}</p>
          {client.notes && <p>Notes: {client.notes}</p>}
          <p className="hint" style={{ marginBottom: 0 }}>Edit this client on the <Link href="/clients">Clients page</Link>.</p>
        </div>
        <div className="card">
          <h2>With this client</h2>
          <p>Outstanding: <strong>{formatMoney(totals.totalOutstanding)}</strong></p>
          <p>Paid: <strong>{formatMoney(totals.totalPaid)}</strong></p>
          <p style={{ marginBottom: 0 }}>Overdue: <strong>{totals.overdueCount} · {formatMoney(totals.overdueAmount)}</strong></p>
        </div>
      </div>
      <div className="card">
        <div className="card-head">
          <h2>Invoices</h2>
          <p>{mine.length} total</p>
        </div>
        {mine.length === 0 ? (
          <p className="hint">No invoices for this client yet.</p>
        ) : (
          <div className="table-wrap">
            <table>
              <thead><tr><th>Description</th><th>Amount</th><th>Status</th><th>Issued</th><th>Due</th></tr></thead>
              <tbody>
                {mine.map((inv) => (
                  <tr key={inv.id}>
                    <td data-label="Description"><Link href={`/invoices/${inv.id}`}>{inv.description}</Link></td>
                    <td data-label="Amount">{formatMoney(inv.amount)}</td>
                    <td data-label="Status"><StatusBadge status={isOverdue(inv, today) ? "overdue" : inv.status} /></td>
                    <td data-label="Issued">{inv.issuedDate}</td>
                    <td data-label="Due">{inv.dueDate}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </Reveal>
  );
}
