import { createHash, randomBytes } from "node:crypto";
import { getAppBaseUrl } from "@/lib/app-url";
import { sendVerificationEmail } from "@/lib/email";
import { prisma } from "@/lib/prisma";

export const EMAIL_VERIFICATION_TTL_MS = 30 * 60 * 1000;

export function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

export function hashVerificationToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export async function issueEmailVerification(userId: string, email: string, nextPath?: string) {
  const normalizedEmail = normalizeEmail(email);
  const token = randomBytes(32).toString("base64url");
  const tokenHash = hashVerificationToken(token);
  const expiresAt = new Date(Date.now() + EMAIL_VERIFICATION_TTL_MS);

  await prisma.$transaction(async (tx) => {
    await tx.emailVerificationToken.deleteMany({
      where: { userId, consumedAt: null }
    });
    await tx.emailVerificationToken.create({
      data: { userId, email: normalizedEmail, tokenHash, expiresAt }
    });
  });

  const verificationUrl = new URL("/verify-email/confirm", getAppBaseUrl());
  verificationUrl.searchParams.set("token", token);
  if (nextPath) {
    verificationUrl.searchParams.set("next", nextPath);
  }
  await sendVerificationEmail({
    to: normalizedEmail,
    verificationUrl: verificationUrl.toString(),
    expiresInMinutes: EMAIL_VERIFICATION_TTL_MS / 60_000
  });
}

export async function consumeEmailVerification(token: string) {
  const tokenHash = hashVerificationToken(token);
  const now = new Date();

  return prisma.$transaction(async (tx) => {
    const candidate = await tx.emailVerificationToken.findUnique({ where: { tokenHash } });

    if (!candidate || candidate.consumedAt || candidate.expiresAt <= now) {
      return false;
    }

    const user = await tx.user.findUnique({
      where: { id: candidate.userId },
      select: { email: true }
    });

    if (!user || normalizeEmail(user.email) !== candidate.email) {
      return false;
    }

    const consumed = await tx.emailVerificationToken.updateMany({
      where: { id: candidate.id, consumedAt: null, expiresAt: { gt: now } },
      data: { consumedAt: now }
    });

    if (consumed.count !== 1) {
      return false;
    }

    await tx.user.update({
      where: { id: candidate.userId },
      data: { emailVerified: true, emailVerifiedAt: now }
    });
    await tx.emailVerificationToken.deleteMany({
      where: { userId: candidate.userId, id: { not: candidate.id }, consumedAt: null }
    });

    return true;
  });
}

export async function changeUnverifiedEmail(userId: string, email: string, nextPath?: string) {
  const normalizedEmail = normalizeEmail(email);

  const user = await prisma.$transaction(async (tx) => {
    const updated = await tx.user.update({
      where: { id: userId },
      data: { email: normalizedEmail, emailVerified: false, emailVerifiedAt: null }
    });
    await tx.emailVerificationToken.deleteMany({ where: { userId } });
    return updated;
  });

  await issueEmailVerification(user.id, user.email, nextPath);
}
