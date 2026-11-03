import { redirect } from "next/navigation";
import Reveal from "../../components/Reveal";
import BillingSection from "../../components/BillingSection";
import BusinessNameForm from "../../components/BusinessNameForm";
import ChangePasswordForm from "../../components/ChangePasswordForm";
import { getBilling, getSessionUser, getUsage } from "../../lib/data";
import { isBillingConfigured } from "../../lib/billing";
import { FREE_CLIENT_LIMIT, FREE_INVOICE_LIMIT, normalizePlan } from "../../lib/plans";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  const usage = await getUsage(user.id);
  const billing = await getBilling(user.id);
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
    </Reveal>
  );
}
