"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/authz";
import {
  DEFAULT_LOCALE,
  LOCALE_COOKIE_MAX_AGE_SECONDS,
  LOCALE_COOKIE_NAME,
  localizeUrl,
  toSupportedLocale
} from "@/lib/i18n/config";
import { organizationsPath } from "@/lib/organization-paths";
import { prisma } from "@/lib/prisma";

/**
 * Applies a language choice: a signed-in member keeps it on their account, a guest keeps it in a
 * cookie, and the reader continues to the same page in the chosen language.
 */
export async function changeLanguage(formData: FormData) {
  const locale = toSupportedLocale(formData.get("locale")?.toString(), DEFAULT_LOCALE);
  const requestedUrl = formData.get("target")?.toString() ?? "";
  const safeUrl =
    requestedUrl.startsWith("/") && !requestedUrl.startsWith("//") ? requestedUrl : organizationsPath(locale);

  cookies().set(LOCALE_COOKIE_NAME, locale, {
    path: "/",
    maxAge: LOCALE_COOKIE_MAX_AGE_SECONDS,
    sameSite: "lax"
  });

  const sessionUser = await getSessionUser();

  if (sessionUser) {
    await prisma.user.update({ where: { id: sessionUser.user.id }, data: { locale } });
  }

  redirect(localizeUrl(safeUrl, locale));
}
