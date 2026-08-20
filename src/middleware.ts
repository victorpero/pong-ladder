import { NextResponse, type NextRequest } from "next/server";
import {
  ACTIVE_PATH_HEADER,
  LOCALE_COOKIE_MAX_AGE_SECONDS,
  LOCALE_COOKIE_NAME,
  localeFromPathname,
  pathnameWithoutLocale,
  resolveLocale,
  type Locale
} from "@/lib/i18n/config";
import { postAuthenticationPath } from "@/lib/organization-paths";

const PUBLIC_PATHS = ["/login", "/verify-email", "/forgot-password", "/reset-password", "/join"];

/**
 * Paths that are not pages and therefore carry no language: API routes, the sign-out handler, the
 * verification callback, and the legacy organization redirect, which needs a database lookup.
 */
const UNLOCALIZED_PATHS = ["/api", "/logout", "/verify-email/confirm", "/org"];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (UNLOCALIZED_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`))) {
    return NextResponse.next();
  }

  const pathLocale = localeFromPathname(pathname);

  // An unprefixed address is sent to the reader's best available language before anything else.
  if (!pathLocale) {
    const locale = resolveLocale({
      guestPreference: request.cookies.get(LOCALE_COOKIE_NAME)?.value,
      acceptLanguage: request.headers.get("accept-language")
    });
    const target = request.nextUrl.clone();
    target.pathname = pathname === "/" ? `/${locale}` : `/${locale}${pathname}`;

    return NextResponse.redirect(target);
  }

  const unprefixedPath = pathnameWithoutLocale(pathname);
  const isPublicPath = PUBLIC_PATHS.some(
    (path) => unprefixedPath === path || unprefixedPath.startsWith(`${path}/`)
  );
  const session =
    request.cookies.get("better-auth.session_token")?.value ||
    request.cookies.get("__Secure-better-auth.session_token")?.value;

  if (unprefixedPath === "/login" && session) {
    const destination = postAuthenticationPath(pathLocale, request.nextUrl.searchParams.get("next"));

    return withActiveLocale(NextResponse.redirect(new URL(destination, request.url)), request, pathLocale);
  }

  if (!isPublicPath && !session) {
    const loginUrl = new URL(`/${pathLocale}/login`, request.url);
    loginUrl.searchParams.set("next", pathname);

    return withActiveLocale(NextResponse.redirect(loginUrl), request, pathLocale);
  }

  // The active path is passed on so localized pages can build canonical and hreflang metadata.
  const forwardedHeaders = new Headers(request.headers);
  forwardedHeaders.set(ACTIVE_PATH_HEADER, pathname);

  return withActiveLocale(NextResponse.next({ request: { headers: forwardedHeaders } }), request, pathLocale);
}

/**
 * Keeps the stored preference in step with the language the reader is actually looking at, so
 * server actions and later unprefixed entries agree with the address bar.
 */
function withActiveLocale(response: NextResponse, request: NextRequest, locale: Locale) {
  if (request.cookies.get(LOCALE_COOKIE_NAME)?.value !== locale) {
    response.cookies.set(LOCALE_COOKIE_NAME, locale, {
      path: "/",
      maxAge: LOCALE_COOKIE_MAX_AGE_SECONDS,
      sameSite: "lax"
    });
  }

  return response;
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)"]
};
