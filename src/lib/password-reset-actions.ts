"use server";

import { z } from "zod";
import { consumePasswordReset, hashPasswordResetToken, requestPasswordReset } from "@/lib/password-reset";
import { PASSWORD_MAX_LENGTH, PASSWORD_MIN_LENGTH } from "@/lib/password-policy";
import { t } from "@/lib/i18n/format";
import { getRequestDictionary } from "@/lib/i18n/server";
import { consumeRateLimit, getClientRateLimitKey, RateLimitError } from "@/lib/rate-limit";

export type PasswordResetFormState = {
  error?: string;
  success?: string;
};

const MAX_TOKEN_LENGTH = 256;

type ResetMessages = ReturnType<typeof getRequestDictionary>["actions"]["passwordReset"];

function emailSchema(messages: ResetMessages) {
  return z.string().trim().email(messages.emailInvalid);
}

function passwordSchema(messages: ResetMessages) {
  return z
    .object({
      password: z
        .string()
        .min(PASSWORD_MIN_LENGTH, t(messages.minLength, { count: PASSWORD_MIN_LENGTH }))
        .max(PASSWORD_MAX_LENGTH, t(messages.maxLength, { count: PASSWORD_MAX_LENGTH })),
      confirmPassword: z.string()
    })
    .refine((value) => value.password === value.confirmPassword, {
      message: messages.passwordsDoNotMatch,
      path: ["confirmPassword"]
    });
}

function getValue(formData: FormData, key: string) {
  return formData.get(key)?.toString() ?? "";
}

function validationError(error: unknown) {
  if (error instanceof RateLimitError) {
    return { error: getRequestDictionary().actions.rateLimited };
  }

  if (error instanceof z.ZodError) {
    return { error: error.issues[0]?.message ?? getRequestDictionary().actions.checkForm };
  }

  return null;
}

export async function sendPasswordResetLink(
  _state: PasswordResetFormState,
  formData: FormData
): Promise<PasswordResetFormState> {
  try {
    consumeRateLimit(getClientRateLimitKey("auth:password-reset:request"), 10, 15 * 60 * 1000);
    const email = emailSchema(getRequestDictionary().actions.passwordReset)
      .parse(getValue(formData, "email"))
      .toLowerCase();
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

  // The same answer for every address, so the form never reveals who has an account.
  return { success: getRequestDictionary().actions.passwordReset.requestConfirmation };
}

export async function resetPassword(
  _state: PasswordResetFormState,
  formData: FormData
): Promise<PasswordResetFormState> {
  const token = getValue(formData, "token").trim();

  if (!token || token.length > MAX_TOKEN_LENGTH) {
    return { error: getRequestDictionary().actions.passwordReset.invalidLink };
  }

  try {
    consumeRateLimit(getClientRateLimitKey("auth:password-reset:confirm"), 10, 15 * 60 * 1000);
    consumeRateLimit(
      getClientRateLimitKey("auth:password-reset:token", hashPasswordResetToken(token)),
      5,
      60 * 60 * 1000
    );
    const parsed = passwordSchema(getRequestDictionary().actions.passwordReset).parse({
      password: getValue(formData, "password"),
      confirmPassword: getValue(formData, "confirmPassword")
    });

    const outcome = await consumePasswordReset(token, parsed.password);

    if (outcome !== "success") {
      return { error: getRequestDictionary().actions.passwordReset.invalidLink };
    }

    return { success: getRequestDictionary().actions.passwordReset.resetConfirmation };
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
    return { error: getRequestDictionary().actions.passwordReset.updateFailed };
  }
}
