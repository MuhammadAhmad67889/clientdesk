import { redirect } from "next/navigation";
import Reveal from "../../components/Reveal";
import ActivityFeed from "../../components/ActivityFeed";
import BillingSection from "../../components/BillingSection";
import BusinessNameForm from "../../components/BusinessNameForm";
import ChangePasswordForm from "../../components/ChangePasswordForm";
import DeleteAccountForm from "../../components/DeleteAccountForm";
import WebhooksForm from "../../components/WebhooksForm";
import { listAuditEntries } from "../../lib/audit";
import { getBilling, getSessionUser, getUsage } from "../../lib/data";
import { isBillingConfigured } from "../../lib/billing";
import { FREE_CLIENT_LIMIT, FREE_INVOICE_LIMIT, normalizePlan } from "../../lib/plans";

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
          <>
            <div className="usage">
              <div className="usage-row">
                <span className="usage-label">
                  <span>Clients</span>
                  <span>{usage.clientCount} of {FREE_CLIENT_LIMIT}</span>
                </span>
                <div className="usage-track">
                  <div
                    className={`usage-fill${usage.clientCount >= FREE_CLIENT_LIMIT ? " full" : ""}`}
                    style={{ width: `${Math.min(100, Math.round((usage.clientCount / FREE_CLIENT_LIMIT) * 100))}%` }}
                  />
                </div>
              </div>
              <div className="usage-row">
                <span className="usage-label">
                  <span>Invoices</span>
                  <span>{usage.invoiceCount} of {FREE_INVOICE_LIMIT}</span>
                </span>
                <div className="usage-track">
                  <div
                    className={`usage-fill${usage.invoiceCount >= FREE_INVOICE_LIMIT ? " full" : ""}`}
                    style={{ width: `${Math.min(100, Math.round((usage.invoiceCount / FREE_INVOICE_LIMIT) * 100))}%` }}
                  />
                </div>
              </div>
            </div>
            <p className="hint" style={{ marginBottom: 0 }}>
              Demo data counts toward these limits. Pro checkout opens once Stripe is connected in test mode.
            </p>
          </>
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
      <WebhooksForm />
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
      <ActivityFeed entries={auditEntries} />
    </Reveal>
  );
}
