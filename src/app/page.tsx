import DashboardClient from "../components/DashboardClient";
import LandingPage from "../components/LandingPage";
import { listAuditEntries } from "../lib/audit";
import { getSessionUser, listClients, listInvoices, listPayments } from "../lib/data";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const user = await getSessionUser();
  if (!user) return <LandingPage />;
  const [clients, invoices, payments, audit] = await Promise.all([listClients(user.id), listInvoices(user.id), listPayments(user.id), listAuditEntries(user.id, 8)]);
  return <DashboardClient initialAudit={audit} initialClients={clients} initialInvoices={invoices} initialPayments={payments} />;
}
