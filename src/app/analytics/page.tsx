import { redirect } from "next/navigation";
import AnalyticsClient from "../../components/AnalyticsClient";
import { getSessionUser, listClients, listInvoices, listPayments } from "../../lib/data";

export const dynamic = "force-dynamic";

export default async function AnalyticsPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  const [clients, invoices, payments] = await Promise.all([listClients(user.id), listInvoices(user.id), listPayments(user.id)]);
  return <AnalyticsClient initialClients={clients} initialInvoices={invoices} initialPayments={payments} />;
}
