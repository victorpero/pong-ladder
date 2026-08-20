"use server";

import { Prisma } from "@prisma/client";
import { z } from "zod";
import { getSessionUser } from "@/lib/authz";
import { changeUnverifiedEmail, issueEmailVerification } from "@/lib/email-verification";
import { t } from "@/lib/i18n/format";
import { getRequestDictionary, getRequestLocale } from "@/lib/i18n/server";
import { consumeRateLimit, getClientRateLimitKey, RateLimitError } from "@/lib/rate-limit";
import { postAuthenticationPath } from "@/lib/organization-paths";

export type VerificationFormState = {
  error?: string;
  success?: string;
};

function emailSchema(message: string) {
  return z.string().trim().email(message);
}

async function requireVerificationUser() {
  const sessionUser = await getSessionUser();

  if (!sessionUser) {
    throw new Error("AUTH_REQUIRED");
  }

  return sessionUser.user;
}

function actionError(error: unknown): VerificationFormState {
  const dictionary = getRequestDictionary();

  if (error instanceof RateLimitError) {
    return { error: dictionary.actions.rateLimited };
  }

  if (error instanceof z.ZodError) {
    return { error: dictionary.actions.verification.emailInvalid };
  }

  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
    return { error: dictionary.actions.verification.emailInUse };
  }

  if (error instanceof Error && error.message === "AUTH_REQUIRED") {
    return { error: dictionary.actions.verification.loginAgain };
  }

  return { error: dictionary.actions.verification.sendFailed };
}

export async function resendVerificationEmail(
  _state: VerificationFormState,
  formData: FormData
): Promise<VerificationFormState> {
  try {
    const user = await requireVerificationUser();

    if (user.emailVerifiedAt) {
      return { success: getRequestDictionary().actions.verification.alreadyVerified };
    }

    consumeRateLimit(getClientRateLimitKey("auth:verify:resend", user.id), 3, 15 * 60 * 1000);
    consumeRateLimit(getClientRateLimitKey("auth:verify:email", user.email), 5, 60 * 60 * 1000);
    await issueEmailVerification(
      user.id,
      user.email,
      postAuthenticationPath(getRequestLocale(), formData.get("next")?.toString())
    );
    return { success: getRequestDictionary().actions.verification.linkSent };
  } catch (error) {
    return actionError(error);
  }
}

export async function updateVerificationEmail(
  _state: VerificationFormState,
  formData: FormData
): Promise<VerificationFormState> {
  try {
    const user = await requireVerificationUser();
    const email = emailSchema(getRequestDictionary().actions.verification.emailInvalid)
      .parse(formData.get("email")?.toString() ?? "")
      .toLowerCase();

    consumeRateLimit(getClientRateLimitKey("auth:verify:change", user.id), 3, 60 * 60 * 1000);
    consumeRateLimit(getClientRateLimitKey("auth:verify:email", email), 5, 60 * 60 * 1000);

    if (email === user.email.toLowerCase()) {
      return { error: getRequestDictionary().actions.verification.differentEmail };
    }

    await changeUnverifiedEmail(
      user.id,
      email,
      postAuthenticationPath(getRequestLocale(), formData.get("next")?.toString())
    );
    return { success: t(getRequestDictionary().actions.verification.sentTo, { email }) };
  } catch (error) {
    return actionError(error);
  }
}
