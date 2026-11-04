import { redirect } from "next/navigation";
import DraftInvoicePage from "../../../components/DraftInvoicePage";
import Reveal from "../../../components/Reveal";
import { getSessionUser, listClients } from "../../../lib/data";

export const dynamic = "force-dynamic";

export default async function DraftPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  const clients = await listClients(user.id);
  return (
    <div>
      <div className="page-head">
        <h1>Draft invoice from text</h1>
        <p className="lead">Paste the details, check the draft, then create the invoice. Nothing is saved until you say so.</p>
      </div>
      <Reveal>
        <DraftInvoicePage clients={clients} />
      </Reveal>
    </div>
  );
}
