import Link from "next/link";
import AuthShell from "../../components/AuthShell";
import ForgotPasswordForm from "../../components/ForgotPasswordForm";
import { isEmailConfigured } from "../../lib/email";

export const metadata = { title: "Reset your password — ClientDesk" };

/** Reset by email only exists when SMTP is configured; otherwise
 * the page says so instead of showing a form that goes nowhere. */
export default function ForgotPasswordPage() {
  const configured = isEmailConfigured();
  return (
    <AuthShell
      lead="We will send a link that works for one hour and can be used once."
      switchNode={<p>Remembered it? <Link href="/login">Log in</Link>.</p>}
      title="Reset your password"
    >
      {configured ? (
        <ForgotPasswordForm />
      ) : (
        <p>
          Password reset by email is not set up yet. If you are signed
          in, you can change your password from{" "}
          <Link href="/settings">Settings</Link> instead.
        </p>
      )}
    </AuthShell>
  );
}
