import { NextResponse } from "next/server";
import { getAppBaseUrl } from "@/lib/app-url";
import { consumeEmailVerification } from "@/lib/email-verification";
import { localeFromCookieHeader, resolveLocale } from "@/lib/i18n/config";
import { appPath, postAuthenticationPath } from "@/lib/organization-paths";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const token = requestUrl.searchParams.get("token");
  const validToken = token && token.length <= 256 ? await consumeEmailVerification(token) : false;
  // The verification link is opened from an email client, so the language comes from the reader.
  const locale = resolveLocale({
    guestPreference: localeFromCookieHeader(request.headers.get("cookie")),
    acceptLanguage: request.headers.get("accept-language")
  });
  const nextPath = postAuthenticationPath(locale, requestUrl.searchParams.get("next"));
  const destination = new URL(appPath(locale, "/verify-email"), getAppBaseUrl());
  destination.searchParams.set("status", validToken ? "verified" : "invalid");
  destination.searchParams.set("next", nextPath);
  return NextResponse.redirect(destination);
}
