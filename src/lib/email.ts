import nodemailer from "nodemailer";

type VerificationMessage = {
  to: string;
  verificationUrl: string;
};

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

  const host = process.env.SMTP_HOST;
  const from = process.env.EMAIL_FROM;

  if (!host || !from) {
    throw new Error("SMTP_HOST and EMAIL_FROM must be configured for SMTP delivery.");
  }

  const port = Number(process.env.SMTP_PORT || 587);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASSWORD;
  const transporter = nodemailer.createTransport({
    host,
    port,
    secure: process.env.SMTP_SECURE === "true",
    auth: user && pass ? { user, pass } : undefined
  });

  await transporter.sendMail({
    from,
    to,
    subject: "Verify your Pong Ladder email",
    text: `Verify your email address by opening this link: ${verificationUrl}`,
    html: `<p>Verify your email address to continue using Pong Ladder.</p><p><a href="${verificationUrl}">Verify email</a></p>`
  });
}
