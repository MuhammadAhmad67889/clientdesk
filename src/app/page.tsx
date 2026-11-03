import DashboardClient from "../components/DashboardClient";
import LandingPage from "../components/LandingPage";
import { getSessionUser, listClients, listInvoices, listPayments } from "../lib/data";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const user = await getSessionUser();
  if (!user) return <LandingPage />;
  const [clients, invoices, payments] = await Promise.all([listClients(user.id), listInvoices(user.id), listPayments(user.id)]);
  return <DashboardClient initialClients={clients} initialInvoices={invoices} initialPayments={payments} />;
}
