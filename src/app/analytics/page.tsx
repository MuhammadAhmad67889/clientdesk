import { redirect } from "next/navigation";
import AnalyticsClient from "../../components/AnalyticsClient";
import { getSessionUser, listInvoices, listPayments } from "../../lib/data";

export const dynamic = "force-dynamic";

export default async function AnalyticsPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  const [invoices, payments] = await Promise.all([listInvoices(user.id), listPayments(user.id)]);
  return <AnalyticsClient initialInvoices={invoices} initialPayments={payments} />;
}
