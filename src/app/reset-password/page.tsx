import Link from "next/link";
import AuthShell from "../../components/AuthShell";
import ResetPasswordForm from "../../components/ResetPasswordForm";

export const metadata = { title: "Choose a new password — ClientDesk" };

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const params = await searchParams;
  const token = typeof params.token === "string" ? params.token : "";
  return (
    <AuthShell
      lead="Pick a new password for your account."
      switchNode={<p><Link href="/login">Back to log in</Link>.</p>}
      title="Choose a new password"
    >
      {token ? (
        <ResetPasswordForm token={token} />
      ) : (
        <p>
          This page needs a reset link. Ask for one from the{" "}
          <Link href="/forgot-password">forgot-password page</Link>.
        </p>
      )}
    </AuthShell>
  );
}
