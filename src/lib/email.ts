import nodemailer from "nodemailer";

type VerificationMessage = {
  to: string;
  verificationUrl: string;
};

export function getEmailTransportConfig(
  env: Readonly<Record<string, string | undefined>> = process.env
) {
  const host = env.SMTP_HOST?.trim();
  const from = env.EMAIL_FROM?.trim();

  if (!host || !from) {
    throw new Error("SMTP_HOST and EMAIL_FROM must be configured for SMTP delivery.");
  }

  const port = Number(env.SMTP_PORT || 587);

  if (!Number.isInteger(port) || port < 1 || port > 65_535) {
    throw new Error("SMTP_PORT must be an integer between 1 and 65535.");
  }

  const isResend = host.toLowerCase() === "smtp.resend.com";
  const user = env.SMTP_USER?.trim() || (isResend ? "resend" : undefined);
  const pass = env.SMTP_PASSWORD || (isResend ? env.RESEND_API_KEY : undefined);

  if (isResend && !pass) {
    throw new Error("RESEND_API_KEY or SMTP_PASSWORD must be configured for Resend SMTP delivery.");
  }

  return {
    from,
    transport: {
      host,
      port,
      secure: env.SMTP_SECURE === "true",
      auth: user && pass ? { user, pass } : undefined
    }
  };
}

function deliveryMode() {
  const configured = process.env.EMAIL_DELIVERY_MODE?.toLowerCase();

  if (configured === "console" || configured === "smtp") {
    return configured;
  }

  return process.env.NODE_ENV === "production" ? "smtp" : "console";
}

export async function sendVerificationEmail({ to, verificationUrl }: VerificationMessage) {
  if (deliveryMode() === "console") {
    console.info(`[email verification] ${to}: ${verificationUrl}`);
    return;
  }

  const { from, transport } = getEmailTransportConfig();
  const transporter = nodemailer.createTransport(transport);

  await transporter.sendMail({
    from,
    to,
    subject: "Verify your Pong Ladder email",
    text: `Verify your email address by opening this link: ${verificationUrl}`,
    html: `<p>Verify your email address to continue using Pong Ladder.</p><p><a href="${verificationUrl}">Verify email</a></p>`
  });
}
