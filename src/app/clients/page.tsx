import { redirect } from "next/navigation";
import ClientsClient from "../../components/ClientsClient";
import { getSessionUser, listClients } from "../../lib/data";

export const dynamic = "force-dynamic";

export default async function ClientsPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  const clients = await listClients(user.id);
  return <ClientsClient initialClients={clients} />;
}
