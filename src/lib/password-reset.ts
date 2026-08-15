import { createHash, randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";
import { getAppBaseUrl } from "@/lib/app-url";
import { sendGoogleSignInNoticeEmail, sendPasswordResetEmail } from "@/lib/email";
import { issueEmailVerification, normalizeEmail } from "@/lib/email-verification";
import { prisma } from "@/lib/prisma";

const CREDENTIAL_PROVIDER_ID = "credential";
const DEFAULT_TTL_MINUTES = 30;
const MIN_TTL_MINUTES = 5;
const MAX_TTL_MINUTES = 120;

/** What the request produced. Never expose this to the requester: it identifies the account. */
export type PasswordResetRequest =
  | "reset-link"
  | "google-sign-in"
  | "verification-required"
  | "no-account";

export type PasswordResetOutcome = "success" | "invalid";

export function getPasswordResetTtlMinutes(
  env: Readonly<Record<string, string | undefined>> = process.env
) {
  const configured = env.PASSWORD_RESET_TOKEN_TTL_MINUTES?.trim();

  if (!configured) {
    return DEFAULT_TTL_MINUTES;
  }

  const minutes = Number(configured);

  if (!Number.isInteger(minutes) || minutes < MIN_TTL_MINUTES || minutes > MAX_TTL_MINUTES) {
    throw new Error(
      `PASSWORD_RESET_TOKEN_TTL_MINUTES must be an integer between ${MIN_TTL_MINUTES} and ${MAX_TTL_MINUTES}.`
    );
  }

  return minutes;
}

export function hashPasswordResetToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export function revokePasswordResetTokens(userId: string) {
  return prisma.passwordResetToken.deleteMany({ where: { userId } });
}

/**
 * Delivery problems must not change the public response, so they are logged without the
 * recipient, the token, or any other account detail.
 */
async function deliverQuietly(send: () => Promise<void>) {
  try {
    await send();
  } catch (error) {
    console.error(
      `[password reset] The email could not be delivered: ${
        error instanceof Error ? error.message : "unknown error"
      }`
    );
  }
}

async function issuePasswordReset(userId: string, email: string) {
  const expiresInMinutes = getPasswordResetTtlMinutes();
  const token = randomBytes(32).toString("base64url");
  const tokenHash = hashPasswordResetToken(token);
  const expiresAt = new Date(Date.now() + expiresInMinutes * 60_000);

  await prisma.$transaction(async (tx) => {
    await tx.passwordResetToken.deleteMany({ where: { userId } });
    await tx.passwordResetToken.create({ data: { userId, email, tokenHash, expiresAt } });
  });

  const resetUrl = new URL("/reset-password", getAppBaseUrl());
  resetUrl.searchParams.set("token", token);

  await deliverQuietly(() =>
    sendPasswordResetEmail({ to: email, resetUrl: resetUrl.toString(), expiresInMinutes })
  );
}

/**
 * Starts a reset for the address if it belongs to an eligible account. Callers must answer the
 * requester the same way for every outcome, including the unknown-address one.
 */
export async function requestPasswordReset(email: string): Promise<PasswordResetRequest> {
  const normalizedEmail = normalizeEmail(email);
  const user = await prisma.user.findFirst({
    where: { email: { equals: normalizedEmail, mode: "insensitive" } },
    select: {
      id: true,
      email: true,
      emailVerifiedAt: true,
      authAccounts: { select: { providerId: true } }
    }
  });

  if (!user) {
    return "no-account";
  }

  if (!user.emailVerifiedAt) {
    // A reset link would confirm the address as a side effect, so send the verification link instead.
    await deliverQuietly(() => issueEmailVerification(user.id, user.email));
    return "verification-required";
  }

  if (!user.authAccounts.some((account) => account.providerId === CREDENTIAL_PROVIDER_ID)) {
    const loginUrl = new URL("/login", getAppBaseUrl()).toString();
    await deliverQuietly(() => sendGoogleSignInNoticeEmail({ to: normalizeEmail(user.email), loginUrl }));
    return "google-sign-in";
  }

  await issuePasswordReset(user.id, normalizeEmail(user.email));
  return "reset-link";
}

/**
 * Consumes a reset token once and applies the new password, then revokes every outstanding token
 * and session for the account.
 */
export async function consumePasswordReset(
  token: string,
  newPassword: string
): Promise<PasswordResetOutcome> {
  const tokenHash = hashPasswordResetToken(token);
  const candidate = await prisma.passwordResetToken.findUnique({ where: { tokenHash } });

  if (!candidate || candidate.consumedAt || candidate.expiresAt <= new Date()) {
    return "invalid";
  }

  const passwordHash = await bcrypt.hash(newPassword, 12);

  return prisma.$transaction(async (tx) => {
    const now = new Date();
    const resetToken = await tx.passwordResetToken.findUnique({ where: { tokenHash } });

    if (!resetToken || resetToken.consumedAt || resetToken.expiresAt <= now) {
      return "invalid";
    }

    const user = await tx.user.findUnique({
      where: { id: resetToken.userId },
      select: { id: true, email: true, emailVerifiedAt: true }
    });

    if (!user || !user.emailVerifiedAt || normalizeEmail(user.email) !== resetToken.email) {
      return "invalid";
    }

    const account = await tx.account.findFirst({
      where: { userId: user.id, providerId: CREDENTIAL_PROVIDER_ID },
      select: { id: true }
    });

    if (!account) {
      return "invalid";
    }

    const consumed = await tx.passwordResetToken.updateMany({
      where: { id: resetToken.id, consumedAt: null, expiresAt: { gt: now } },
      data: { consumedAt: now }
    });

    if (consumed.count !== 1) {
      return "invalid";
    }

    await tx.account.update({ where: { id: account.id }, data: { password: passwordHash } });
    await tx.passwordResetToken.deleteMany({ where: { userId: user.id, id: { not: resetToken.id } } });
    await tx.user.update({ where: { id: user.id }, data: { passwordChangedAt: now } });
    await tx.session.deleteMany({ where: { userId: user.id } });

    return "success";
  });
}
