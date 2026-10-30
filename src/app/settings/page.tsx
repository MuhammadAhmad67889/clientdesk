import { redirect } from "next/navigation";
import Reveal from "../../components/Reveal";
import ChangePasswordForm from "../../components/ChangePasswordForm";
import { getSessionUser } from "../../lib/data";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  return (
    <Reveal>
      <div className="page-head">
        <h1>Settings</h1>
        <p className="lead">Your account, and the one password change this app can actually do today.</p>
      </div>
      <div className="card">
        <h2>Account</h2>
        <p style={{ margin: 0 }}>Signed in as <strong>{user.email}</strong></p>
        <p className="hint" style={{ marginBottom: 0 }}>
          There is no password reset by email yet — that needs an email service, which this app does not have.
          If you are signed in, you can change your password here instead.
        </p>
      </div>
      <ChangePasswordForm />
    </Reveal>
  );
}
