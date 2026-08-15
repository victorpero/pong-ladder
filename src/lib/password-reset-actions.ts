"use server";

import { z } from "zod";
import { consumePasswordReset, hashPasswordResetToken, requestPasswordReset } from "@/lib/password-reset";
import { PASSWORD_MAX_LENGTH, PASSWORD_MIN_LENGTH } from "@/lib/password-policy";
import { consumeRateLimit, getClientRateLimitKey, RateLimitError } from "@/lib/rate-limit";

export type PasswordResetFormState = {
  error?: string;
  success?: string;
};

/** The same answer for every address, so the form never reveals who has an account. */
const REQUEST_CONFIRMATION =
  "If that address belongs to a Pong Ladder account, password reset instructions are on their way. Check your inbox and spam folder.";
const RESET_CONFIRMATION =
  "Your password has been updated and every signed-in device was logged out. Log in with your new password.";
const INVALID_LINK =
  "That password reset link is invalid, expired, or already used. Request a new link and try again.";
const MAX_TOKEN_LENGTH = 256;

const emailSchema = z.string().trim().email("Enter a valid email address.");

const passwordSchema = z
  .object({
    password: z
      .string()
      .min(PASSWORD_MIN_LENGTH, `Password must be at least ${PASSWORD_MIN_LENGTH} characters.`)
      .max(PASSWORD_MAX_LENGTH, `Password must be at most ${PASSWORD_MAX_LENGTH} characters.`),
    confirmPassword: z.string()
  })
  .refine((value) => value.password === value.confirmPassword, {
    message: "The passwords do not match.",
    path: ["confirmPassword"]
  });

function getValue(formData: FormData, key: string) {
  return formData.get(key)?.toString() ?? "";
}

function validationError(error: unknown) {
  if (error instanceof RateLimitError) {
    return { error: error.message };
  }

  if (error instanceof z.ZodError) {
    return { error: error.issues[0]?.message ?? "Check the form and try again." };
  }

  return null;
}

export async function sendPasswordResetLink(
  _state: PasswordResetFormState,
  formData: FormData
): Promise<PasswordResetFormState> {
  try {
    consumeRateLimit(getClientRateLimitKey("auth:password-reset:request"), 10, 15 * 60 * 1000);
    const email = emailSchema.parse(getValue(formData, "email")).toLowerCase();
    consumeRateLimit(getClientRateLimitKey("auth:password-reset:address", email), 5, 60 * 60 * 1000);

    await requestPasswordReset(email);
  } catch (error) {
    const failure = validationError(error);

    if (failure) {
      return failure;
    }

    // Any other failure stays invisible to the requester: a distinct answer would tell an
    // attacker which addresses exist.
    console.error(
      `[password reset] The request could not be completed: ${
        error instanceof Error ? error.message : "unknown error"
      }`
    );
  }

  return { success: REQUEST_CONFIRMATION };
}

export async function resetPassword(
  _state: PasswordResetFormState,
  formData: FormData
): Promise<PasswordResetFormState> {
  const token = getValue(formData, "token").trim();

  if (!token || token.length > MAX_TOKEN_LENGTH) {
    return { error: INVALID_LINK };
  }

  try {
    consumeRateLimit(getClientRateLimitKey("auth:password-reset:confirm"), 10, 15 * 60 * 1000);
    consumeRateLimit(
      getClientRateLimitKey("auth:password-reset:token", hashPasswordResetToken(token)),
      5,
      60 * 60 * 1000
    );
    const parsed = passwordSchema.parse({
      password: getValue(formData, "password"),
      confirmPassword: getValue(formData, "confirmPassword")
    });

    const outcome = await consumePasswordReset(token, parsed.password);

    if (outcome !== "success") {
      return { error: INVALID_LINK };
    }

    return { success: RESET_CONFIRMATION };
  } catch (error) {
    const failure = validationError(error);

    if (failure) {
      return failure;
    }

    console.error(
      `[password reset] The password could not be updated: ${
        error instanceof Error ? error.message : "unknown error"
      }`
    );
    return { error: "The password could not be updated. Please try again." };
  }
}
