import nodemailer from "nodemailer";
import {
  renderGoogleSignInNoticeEmail,
  renderPasswordResetEmail
} from "@/lib/password-reset-email-template";
import { renderVerificationEmail } from "@/lib/verification-email-template";

type VerificationMessage = {
  to: string;
  verificationUrl: string;
  expiresInMinutes: number;
};

type PasswordResetMessage = {
  to: string;
  resetUrl: string;
  expiresInMinutes: number;
};

type GoogleSignInNoticeMessage = {
  to: string;
  loginUrl: string;
};

type RenderedEmail = {
  subject: string;
  html: string;
  text: string;
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

async function deliver(to: string, { subject, html, text }: RenderedEmail) {
  const { from, transport } = getEmailTransportConfig();
  const transporter = nodemailer.createTransport(transport);

  await transporter.sendMail({ from, to, subject, text, html });
}

export async function sendVerificationEmail({
  to,
  verificationUrl,
  expiresInMinutes
}: VerificationMessage) {
  if (deliveryMode() === "console") {
    console.info(`[email verification] ${to}: ${verificationUrl}`);
    return;
  }

  await deliver(to, renderVerificationEmail({ verificationUrl, expiresInMinutes }));
}

export async function sendPasswordResetEmail({ to, resetUrl, expiresInMinutes }: PasswordResetMessage) {
  if (deliveryMode() === "console") {
    console.info(`[password reset] ${to}: ${resetUrl}`);
    return;
  }

  await deliver(to, renderPasswordResetEmail({ resetUrl, expiresInMinutes }));
}

export async function sendGoogleSignInNoticeEmail({ to, loginUrl }: GoogleSignInNoticeMessage) {
  if (deliveryMode() === "console") {
    console.info(`[password reset] ${to}: account signs in with Google`);
    return;
  }

  await deliver(to, renderGoogleSignInNoticeEmail({ loginUrl }));
}
