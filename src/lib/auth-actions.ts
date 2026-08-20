"use server";

import { Prisma } from "@prisma/client";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { getSessionUser, verifyEmailPath } from "@/lib/authz";
import { issueEmailVerification } from "@/lib/email-verification";
import {
  LOCALE_COOKIE_MAX_AGE_SECONDS,
  LOCALE_COOKIE_NAME,
  isSupportedLocale,
  localizeUrl
} from "@/lib/i18n/config";
import { getRequestDictionary, getRequestLocale } from "@/lib/i18n/server";
import { appPath, loginPath, organizationsPath, postAuthenticationPath } from "@/lib/organization-paths";
import { revokePasswordResetTokens } from "@/lib/password-reset";
import { prisma } from "@/lib/prisma";
import { consumeRateLimit, getClientRateLimitKey, RateLimitError } from "@/lib/rate-limit";

export type AuthFormState = {
  error?: string;
  success?: string;
};

// Validation copy comes from the active dictionary, so a Swedish form never answers in English.
function loginSchema(messages: AuthMessages) {
  return z.object({
    identifier: z.string().trim().min(2, messages.identifierRequired),
    password: z.string().min(8, messages.passwordLength)
  });
}

function createAccountSchema(messages: AuthMessages) {
  return z.object({
    username: z.string().trim().min(2, messages.usernameLength).max(30),
    fullName: z.string().trim().min(2, messages.fullNameRequired).max(120),
    email: z.string().trim().email(messages.emailInvalid),
    password: z.string().min(8, messages.passwordLength).max(128)
  });
}

function changePasswordSchema(messages: AuthMessages) {
  return z
    .object({
      currentPassword: z.string().min(8, messages.currentPasswordLength),
      newPassword: z.string().min(8, messages.newPasswordLength).max(128),
      confirmPassword: z.string().min(8, messages.confirmPasswordLength)
    })
    .refine((value) => value.newPassword === value.confirmPassword, {
      message: messages.passwordsDoNotMatch,
      path: ["confirmPassword"]
    });
}

type AuthMessages = ReturnType<typeof getRequestDictionary>["actions"]["auth"];

function getValue(formData: FormData, key: string) {
  return formData.get(key)?.toString() ?? "";
}

function getSafeRedirectPath(formData: FormData) {
  const locale = getRequestLocale();
  const nextPath = getValue(formData, "next");
  const safePath = nextPath.startsWith("/") && !nextPath.startsWith("//") ? nextPath : organizationsPath(locale);
  return postAuthenticationPath(locale, safePath);
}

function authError(error: unknown): AuthFormState {
  const dictionary = getRequestDictionary();

  if (error instanceof z.ZodError) {
    return { error: error.issues[0]?.message ?? dictionary.actions.checkForm };
  }

  if (error instanceof RateLimitError) {
    return { error: dictionary.actions.rateLimited };
  }

  if (error instanceof Error && /invalid email or password|invalid password/i.test(error.message)) {
    return { error: dictionary.actions.auth.invalidCredentials };
  }

  return { error: dictionary.actions.genericError };
}

async function postSignInPath(userId: string, requestedPath: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { emailVerifiedAt: true, locale: true }
  });
  // A saved account language survives signing out, so a new device opens in the chosen language.
  const locale = applySavedLanguagePreference(user?.locale);

  if (!user?.emailVerifiedAt) {
    return `${verifyEmailPath(locale)}?next=${encodeURIComponent(localizeUrl(requestedPath, locale))}`;
  }

  return postAuthenticationPath(locale, requestedPath);
}

function applySavedLanguagePreference(savedLocale: string | null | undefined) {
  if (!isSupportedLocale(savedLocale)) {
    return getRequestLocale();
  }

  cookies().set(LOCALE_COOKIE_NAME, savedLocale, {
    path: "/",
    maxAge: LOCALE_COOKIE_MAX_AGE_SECONDS,
    sameSite: "lax"
  });

  return savedLocale;
}

export async function login(_state: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const requestedPath = getSafeRedirectPath(formData);
  let destination = requestedPath;

  try {
    consumeRateLimit(getClientRateLimitKey("auth:login"), 30, 5 * 60 * 1000);
    const parsed = loginSchema(getRequestDictionary().actions.auth).parse({
      identifier: getValue(formData, "identifier"),
      password: getValue(formData, "password")
    });
    consumeRateLimit(getClientRateLimitKey("auth:login:identifier", parsed.identifier.toLowerCase()), 8, 5 * 60 * 1000);

    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { email: { equals: parsed.identifier, mode: "insensitive" } },
          { username: { equals: parsed.identifier, mode: "insensitive" } }
        ]
      },
      select: { id: true, email: true }
    });

    if (!user) {
      return { error: getRequestDictionary().actions.auth.invalidCredentials };
    }

    const result = await auth.api.signInEmail({
      headers: await headers(),
      body: { email: user.email, password: parsed.password, rememberMe: true }
    });
    destination = await postSignInPath(result.user.id, requestedPath);
  } catch (error) {
    return authError(error);
  }

  redirect(destination);
}

export async function createAccount(_state: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const requestedPath = getSafeRedirectPath(formData);
  let destination = `${verifyEmailPath(getRequestLocale())}?next=${encodeURIComponent(requestedPath)}`;

  try {
    consumeRateLimit(getClientRateLimitKey("auth:create-account"), 5, 60 * 60 * 1000);
    const parsed = createAccountSchema(getRequestDictionary().actions.auth).parse({
      username: getValue(formData, "username"),
      fullName: getValue(formData, "fullName"),
      email: getValue(formData, "email").toLowerCase(),
      password: getValue(formData, "password")
    });

    const result = await auth.api.signUpEmail({
      headers: await headers(),
      body: {
        name: parsed.fullName,
        email: parsed.email,
        password: parsed.password,
        username: parsed.username,
        rememberMe: true
      }
    });

    try {
      await issueEmailVerification(result.user.id, result.user.email, requestedPath);
    } catch {
      destination = `${verifyEmailPath(getRequestLocale())}?delivery=failed&next=${encodeURIComponent(requestedPath)}`;
    }
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return { error: getRequestDictionary().actions.auth.accountExists };
    }

    if (error instanceof Error && /already exists|user already/i.test(error.message)) {
      return { error: getRequestDictionary().actions.auth.accountExists };
    }

    return authError(error);
  }

  redirect(destination);
}

export async function changePassword(_state: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const sessionUser = await getSessionUser();

  const locale = getRequestLocale();

  if (!sessionUser) {
    redirect(loginPath(locale, appPath(locale, "/account")));
  }

  try {
    consumeRateLimit(getClientRateLimitKey("auth:change-password", sessionUser.user.id), 5, 15 * 60 * 1000);
    const parsed = changePasswordSchema(getRequestDictionary().actions.auth).parse({
      currentPassword: getValue(formData, "currentPassword"),
      newPassword: getValue(formData, "newPassword"),
      confirmPassword: getValue(formData, "confirmPassword")
    });

    if (parsed.currentPassword === parsed.newPassword) {
      return { error: getRequestDictionary().actions.auth.samePassword };
    }

    await auth.api.changePassword({
      headers: await headers(),
      body: {
        currentPassword: parsed.currentPassword,
        newPassword: parsed.newPassword,
        revokeOtherSessions: true
      }
    });

    await prisma.user.update({
      where: { id: sessionUser.user.id },
      data: { passwordChangedAt: new Date() }
    });
    await revokePasswordResetTokens(sessionUser.user.id);

    return { success: getRequestDictionary().actions.auth.passwordUpdated };
  } catch (error) {
    if (error instanceof Error && /incorrect|invalid password/i.test(error.message)) {
      return { error: getRequestDictionary().actions.auth.currentPasswordIncorrect };
    }

    return authError(error);
  }
}

export async function logout() {
  const locale = getRequestLocale();
  await auth.api.signOut({ headers: await headers() });
  redirect(loginPath(locale));
}
