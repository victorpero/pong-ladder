"use server";

import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { getSessionUser, verifyEmailPath } from "@/lib/authz";
import { issueEmailVerification } from "@/lib/email-verification";
import { organizationsPath, postAuthenticationPath } from "@/lib/organization-paths";
import { prisma } from "@/lib/prisma";
import { consumeRateLimit, getClientRateLimitKey, RateLimitError } from "@/lib/rate-limit";

export type AuthFormState = {
  error?: string;
  success?: string;
};

const loginSchema = z.object({
  identifier: z.string().trim().min(2, "Enter your email or username."),
  password: z.string().min(8, "Password must be at least 8 characters.")
});

const createAccountSchema = z.object({
  username: z.string().trim().min(2, "Username must be at least 2 characters.").max(30),
  fullName: z.string().trim().min(2, "Enter your full name.").max(120),
  email: z.string().trim().email("Enter a valid email address."),
  password: z.string().min(8, "Password must be at least 8 characters.").max(128)
});

const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(8, "Current password must be at least 8 characters."),
    newPassword: z.string().min(8, "New password must be at least 8 characters.").max(128),
    confirmPassword: z.string().min(8, "Confirm password must be at least 8 characters.")
  })
  .refine((value) => value.newPassword === value.confirmPassword, {
    message: "New passwords do not match.",
    path: ["confirmPassword"]
  });

function getValue(formData: FormData, key: string) {
  return formData.get(key)?.toString() ?? "";
}

function getSafeRedirectPath(formData: FormData) {
  const nextPath = getValue(formData, "next");
  const safePath = nextPath.startsWith("/") && !nextPath.startsWith("//") ? nextPath : organizationsPath;
  return postAuthenticationPath(safePath);
}

function authError(error: unknown): AuthFormState {
  if (error instanceof z.ZodError) {
    return { error: error.issues[0]?.message ?? "Check the form and try again." };
  }

  if (error instanceof RateLimitError) {
    return { error: error.message };
  }

  if (error instanceof Error && /invalid email or password|invalid password/i.test(error.message)) {
    return { error: "Invalid email, username, or password." };
  }

  return { error: "Something went wrong. Please try again." };
}

async function postSignInPath(userId: string, requestedPath: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { emailVerifiedAt: true }
  });

  if (!user?.emailVerifiedAt) {
    return `${verifyEmailPath}?next=${encodeURIComponent(requestedPath)}`;
  }

  return postAuthenticationPath(requestedPath);
}

export async function login(_state: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const requestedPath = getSafeRedirectPath(formData);
  let destination = requestedPath;

  try {
    consumeRateLimit(getClientRateLimitKey("auth:login"), 30, 5 * 60 * 1000);
    const parsed = loginSchema.parse({
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
      return { error: "Invalid email, username, or password." };
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
  let destination = `${verifyEmailPath}?next=${encodeURIComponent(requestedPath)}`;

  try {
    consumeRateLimit(getClientRateLimitKey("auth:create-account"), 5, 60 * 60 * 1000);
    const parsed = createAccountSchema.parse({
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
      destination = `${verifyEmailPath}?delivery=failed&next=${encodeURIComponent(requestedPath)}`;
    }
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return { error: "A player with that username or email already exists." };
    }

    if (error instanceof Error && /already exists|user already/i.test(error.message)) {
      return { error: "A player with that username or email already exists." };
    }

    return authError(error);
  }

  redirect(destination);
}

export async function changePassword(_state: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const sessionUser = await getSessionUser();

  if (!sessionUser) {
    redirect("/login?next=/account");
  }

  try {
    consumeRateLimit(getClientRateLimitKey("auth:change-password", sessionUser.user.id), 5, 15 * 60 * 1000);
    const parsed = changePasswordSchema.parse({
      currentPassword: getValue(formData, "currentPassword"),
      newPassword: getValue(formData, "newPassword"),
      confirmPassword: getValue(formData, "confirmPassword")
    });

    if (parsed.currentPassword === parsed.newPassword) {
      return { error: "New password must be different from your current password." };
    }

    await auth.api.changePassword({
      headers: await headers(),
      body: {
        currentPassword: parsed.currentPassword,
        newPassword: parsed.newPassword,
        revokeOtherSessions: true
      }
    });

    revalidatePath("/account");
    return { success: "Password updated." };
  } catch (error) {
    if (error instanceof Error && /incorrect|invalid password/i.test(error.message)) {
      return { error: "Current password is incorrect." };
    }

    return authError(error);
  }
}

export async function logout() {
  await auth.api.signOut({ headers: await headers() });
  redirect("/login");
}
