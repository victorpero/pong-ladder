"use server";

import { Prisma } from "@prisma/client";
import { z } from "zod";
import { getSessionUser } from "@/lib/authz";
import { changeUnverifiedEmail, issueEmailVerification } from "@/lib/email-verification";
import { consumeRateLimit, getClientRateLimitKey, RateLimitError } from "@/lib/rate-limit";

export type VerificationFormState = {
  error?: string;
  success?: string;
};

const emailSchema = z.string().trim().email("Enter a valid email address.");

async function requireVerificationUser() {
  const sessionUser = await getSessionUser();

  if (!sessionUser) {
    throw new Error("AUTH_REQUIRED");
  }

  return sessionUser.user;
}

function actionError(error: unknown): VerificationFormState {
  if (error instanceof RateLimitError) {
    return { error: error.message };
  }

  if (error instanceof z.ZodError) {
    return { error: error.issues[0]?.message ?? "Enter a valid email address." };
  }

  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
    return { error: "That email address is already in use." };
  }

  if (error instanceof Error && error.message === "AUTH_REQUIRED") {
    return { error: "Log in again before requesting a verification email." };
  }

  return { error: "The email could not be sent. Please try again." };
}

export async function resendVerificationEmail(_state: VerificationFormState): Promise<VerificationFormState> {
  try {
    const user = await requireVerificationUser();

    if (user.emailVerifiedAt) {
      return { success: "Your email is already verified." };
    }

    consumeRateLimit(getClientRateLimitKey("auth:verify:resend", user.id), 3, 15 * 60 * 1000);
    consumeRateLimit(getClientRateLimitKey("auth:verify:email", user.email), 5, 60 * 60 * 1000);
    await issueEmailVerification(user.id, user.email);
    return { success: "A fresh verification link has been sent." };
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
    const email = emailSchema.parse(formData.get("email")?.toString() ?? "").toLowerCase();

    consumeRateLimit(getClientRateLimitKey("auth:verify:change", user.id), 3, 60 * 60 * 1000);
    consumeRateLimit(getClientRateLimitKey("auth:verify:email", email), 5, 60 * 60 * 1000);

    if (email === user.email.toLowerCase()) {
      return { error: "Enter a different email address." };
    }

    await changeUnverifiedEmail(user.id, email);
    return { success: `Verification email sent to ${email}.` };
  } catch (error) {
    return actionError(error);
  }
}
