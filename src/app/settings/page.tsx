import { redirect } from "next/navigation";
import Reveal from "../../components/Reveal";
import BillingSection from "../../components/BillingSection";
import BusinessNameForm from "../../components/BusinessNameForm";
import ChangePasswordForm from "../../components/ChangePasswordForm";
import DeleteAccountForm from "../../components/DeleteAccountForm";
import { listAuditEntries } from "../../lib/audit";
import { getBilling, getSessionUser, getUsage } from "../../lib/data";
import { isBillingConfigured } from "../../lib/billing";
import { FREE_CLIENT_LIMIT, FREE_INVOICE_LIMIT, normalizePlan } from "../../lib/plans";

/** Plain words for the audit actions stored in the database. */
const auditLabels: Record<string, string> = {
  "client.archived": "Client archived",
  "client.created": "Client added",
  "client.deleted": "Client deleted",
  "client.unarchived": "Client unarchived",
  "client.updated": "Client updated",
  "invoice.created": "Invoice created",
  "invoice.deleted": "Invoice deleted",
  "invoice.paid": "Invoice marked paid",
  "invoice.unpaid": "Invoice marked unpaid",
  "invoice.updated": "Invoice updated",
  "payment.deleted": "Payment deleted",
  "payment.recorded": "Payment recorded",
  "recurring.created": "Recurring invoice added",
  "recurring.deleted": "Recurring invoice stopped",
};

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  const usage = await getUsage(user.id);
  const billing = await getBilling(user.id);
  const auditEntries = await listAuditEntries(user.id);
  const plan = normalizePlan(usage.plan);
  return (
    <Reveal>
      <div className="page-head">
        <h1>Settings</h1>
        <p className="lead">Your account, and the one password change this app can actually do today.</p>
      </div>
      <div className="card">
        <h2>Plan</h2>
        <p style={{ margin: 0 }}>
          Current plan: <strong>{plan === "free" ? "Free" : plan === "pro" ? "Pro" : "Business"}</strong>
        </p>
        {plan === "free" ? (
          <p className="hint" style={{ marginBottom: 0 }}>
            Usage: {usage.clientCount} of {FREE_CLIENT_LIMIT} clients · {usage.invoiceCount} of {FREE_INVOICE_LIMIT} invoices.
            Demo data counts toward these limits. Pro checkout opens once Stripe is connected in test mode.
          </p>
        ) : (
          <p className="hint" style={{ marginBottom: 0 }}>
            Usage: {usage.clientCount} clients · {usage.invoiceCount} invoices — unlimited on your plan.
          </p>
        )}
      </div>
      <BillingSection
        billingConfigured={isBillingConfigured()}
        hasStripeCustomer={billing.hasStripeCustomer}
        plan={plan}
        subscriptionStatus={billing.subscriptionStatus}
      />
      <div className="card">
        <h2>Account</h2>
        <p style={{ margin: 0 }}>Signed in as <strong>{user.email}</strong></p>
        <p className="hint" style={{ marginBottom: 0 }}>
          There is no password reset by email yet — that needs an email service, which this app does not have.
          If you are signed in, you can change your password here instead.
        </p>
      </div>
      <ChangePasswordForm />
      <BusinessNameForm initialName={user.businessName ?? ""} />
      <div className="card">
        <h2>Your data</h2>
        <p style={{ margin: 0 }}>
          Download everything in your account — clients, invoices, payments and recurring invoices — as one JSON file.
          Passwords, sessions and reset tokens are never included.
        </p>
        <div className="page-actions">
          <a className="btn" href="/api/me/export">Export my data</a>
        </div>
        <DeleteAccountForm email={user.email} />
      </div>
      <div className="card">
        <h2>Recent account activity</h2>
        {auditEntries.length === 0 ? (
          <p className="hint" style={{ margin: 0 }}>Nothing recorded yet — changes you make will appear here.</p>
        ) : (
          <ul style={{ margin: 0, paddingLeft: 20 }}>
            {auditEntries.map((entry, i) => (
              <li key={`${entry.createdAt}-${entry.action}-${i}`}>
                {auditLabels[entry.action] ?? entry.action}
                {entry.detail ? ` — ${entry.detail}` : ""} · {entry.createdAt}
              </li>
            ))}
          </ul>
        )}
      </div>
    </Reveal>
  );
}
