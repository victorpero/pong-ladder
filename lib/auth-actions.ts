"use server";

import bcrypt from "bcryptjs";
import { Prisma } from "@prisma/client";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { consumeRateLimit, getClientRateLimitKey, RateLimitError } from "@/lib/rate-limit";
import { joinActiveSeasonForUser } from "@/lib/season-membership";
import { createSessionToken, SESSION_COOKIE_NAME, sessionCookieOptions } from "@/lib/session";

export type AuthFormState = {
  error?: string;
};

const loginSchema = z.object({
  identifier: z.string().trim().min(2, "Enter your email or username."),
  password: z.string().min(8, "Password must be at least 8 characters.")
});

const createAccountSchema = z.object({
  username: z.string().trim().min(2, "Username must be at least 2 characters.").max(30),
  fullName: z.string().trim().min(2, "Enter your full name.").max(120),
  email: z.string().trim().email("Enter a valid email address."),
  password: z.string().min(8, "Password must be at least 8 characters.")
});

function getValue(formData: FormData, key: string) {
  return formData.get(key)?.toString() ?? "";
}

function getSafeRedirectPath(formData: FormData) {
  const nextPath = getValue(formData, "next");

  if (nextPath.startsWith("/") && !nextPath.startsWith("//")) {
    return nextPath;
  }

  return "/ladder";
}

function authError(error: unknown): AuthFormState {
  if (error instanceof z.ZodError) {
    return { error: error.errors[0]?.message ?? "Check the form and try again." };
  }

  if (error instanceof Error && error.message.includes("SESSION_SECRET")) {
    return { error: "Session secret is not configured. Add SESSION_SECRET to your environment." };
  }

  if (error instanceof RateLimitError) {
    return { error: error.message };
  }

  return { error: "Something went wrong. Please try again." };
}

async function setSession(user: { id: string; username: string; email: string }) {
  const token = await createSessionToken({
    sub: user.id,
    username: user.username,
    email: user.email
  });

  cookies().set(SESSION_COOKIE_NAME, token, sessionCookieOptions());
}

export async function login(_state: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const nextPath = getSafeRedirectPath(formData);

  try {
    consumeRateLimit(getClientRateLimitKey("auth:login"), 30, 5 * 60 * 1000);

    const parsed = loginSchema.parse({
      identifier: getValue(formData, "identifier"),
      password: getValue(formData, "password")
    });
    consumeRateLimit(getClientRateLimitKey("auth:login:identifier", parsed.identifier.toLowerCase()), 8, 5 * 60 * 1000);

    const user = await prisma.user.findFirst({
      where: {
        OR: [{ email: parsed.identifier.toLowerCase() }, { username: parsed.identifier }]
      }
    });

    if (!user || !(await bcrypt.compare(parsed.password, user.passwordHash))) {
      return { error: "Invalid email, username, or password." };
    }

    await setSession(user);
  } catch (error) {
    return authError(error);
  }

  redirect(nextPath);
}

export async function createAccount(_state: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const nextPath = getSafeRedirectPath(formData);
  const joinCurrentSeason = formData.get("joinCurrentSeason") === "on";

  try {
    consumeRateLimit(getClientRateLimitKey("auth:create-account"), 5, 60 * 60 * 1000);

    const parsed = createAccountSchema.parse({
      username: getValue(formData, "username"),
      fullName: getValue(formData, "fullName"),
      email: getValue(formData, "email"),
      password: getValue(formData, "password")
    });

    const passwordHash = await bcrypt.hash(parsed.password, 12);
    const user = await prisma.$transaction(async (tx) => {
      const createdUser = await tx.user.create({
        data: {
          username: parsed.username,
          fullName: parsed.fullName,
          email: parsed.email.toLowerCase(),
          passwordHash
        }
      });

      if (joinCurrentSeason) {
        await joinActiveSeasonForUser(tx, createdUser.id);
      }

      return createdUser;
    });

    await setSession(user);
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return { error: "A player with that username or email already exists." };
    }

    return authError(error);
  }

  redirect(nextPath);
}

export async function logout() {
  cookies().delete(SESSION_COOKIE_NAME);
  redirect("/login");
}
