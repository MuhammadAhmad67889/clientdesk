import { redirect } from "next/navigation";
import InvoicesClient from "../../components/InvoicesClient";
import { getSessionUser, listClients, listInvoices, listPayments, listRecurringTemplates } from "../../lib/data";

export const dynamic = "force-dynamic";

export default async function InvoicesPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  const [clients, invoices, payments, recurring] = await Promise.all([listClients(user.id), listInvoices(user.id), listPayments(user.id), listRecurringTemplates(user.id)]);
  return <InvoicesClient initialClients={clients} initialInvoices={invoices} initialPayments={payments} initialRecurring={recurring} />;
}
