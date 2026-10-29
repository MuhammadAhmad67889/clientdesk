import { redirect } from "next/navigation";
import DashboardClient from "../components/DashboardClient";
import { getSessionUser, listClients, listInvoices } from "../lib/data";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  const [clients, invoices] = await Promise.all([listClients(user.id), listInvoices(user.id)]);
  return <DashboardClient initialClients={clients} initialInvoices={invoices} />;
}
