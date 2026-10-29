import { redirect } from "next/navigation";
import InvoicesClient from "../../components/InvoicesClient";
import { getSessionUser, listClients, listInvoices } from "../../lib/data";

export const dynamic = "force-dynamic";

export default async function InvoicesPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  const [clients, invoices] = await Promise.all([listClients(user.id), listInvoices(user.id)]);
  return <InvoicesClient initialClients={clients} initialInvoices={invoices} />;
}
