import { redirect } from "next/navigation";
import PaymentsClient from "../../components/PaymentsClient";
import { getSessionUser, listClients, listInvoices, listPayments } from "../../lib/data";

export const dynamic = "force-dynamic";

export default async function PaymentsPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  const [clients, invoices, payments] = await Promise.all([listClients(user.id), listInvoices(user.id), listPayments(user.id)]);
  return <PaymentsClient initialClients={clients} initialInvoices={invoices} initialPayments={payments} />;
}
