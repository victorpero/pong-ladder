import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { localeFromCookieHeader, resolveLocale } from "@/lib/i18n/config";
import { loginPath } from "@/lib/organization-paths";

export async function GET(request: Request) {
  // The stored preference outlives the session, so signing out still lands on the right language.
  const locale = resolveLocale({
    guestPreference: localeFromCookieHeader(request.headers.get("cookie")),
    acceptLanguage: request.headers.get("accept-language")
  });
  const signedOut = await auth.api.signOut({ headers: request.headers, asResponse: true });
  const response = NextResponse.redirect(new URL(loginPath(locale), request.url));

  const setCookie = signedOut.headers.get("set-cookie");
  if (setCookie) {
    response.headers.set("set-cookie", setCookie);
  }

  return response;
}
