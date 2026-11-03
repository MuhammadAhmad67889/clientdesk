import nodemailer from "nodemailer";

/** Email is sent through Gmail's free SMTP server with an app
 * password (a normal Gmail password will not work — Google requires
 * an app password for SMTP). When the two env vars are missing, the
 * forgot-password page says reset is not set up yet instead of
 * pretending to send anything. */
export function isEmailConfigured(): boolean {
  return Boolean(process.env.SMTP_USER && process.env.SMTP_PASS);
}

export async function sendPasswordResetEmail(to: string, resetUrl: string): Promise<void> {
  const transporter = nodemailer.createTransport({
    auth: { pass: process.env.SMTP_PASS, user: process.env.SMTP_USER },
    host: "smtp.gmail.com",
    port: 587,
    secure: false,
  });
  await transporter.sendMail({
    from: process.env.SMTP_USER,
    subject: "Reset your ClientDesk password",
    text:
      `Someone asked to reset the password for your ClientDesk account.\n\n` +
      `Reset it here: ${resetUrl}\n\n` +
      `The link works for one hour and can be used once. ` +
      `If you did not ask for this, ignore this email — your password is unchanged.`,
    to,
  });
}
