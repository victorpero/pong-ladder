import { localizePathname, pathnameWithoutLocale, type Locale } from "@/lib/i18n/config";

const organizationRoutePattern = /^\/org\/([^/]+)(?:\/|$)/;
const invitationRoutePattern = /^\/join\/[^?#]+(?:[?#].*)?$/;

/** Every application route carries its language, so links stay explicit and shareable. */
export function appPath(locale: Locale, path: string) {
  return localizePathname(path, locale);
}

export function organizationsPath(locale: Locale) {
  return appPath(locale, "/organizations");
}

export function newOrganizationPath(locale: Locale) {
  return appPath(locale, "/organizations/new");
}

export function loginPath(locale: Locale, nextPath?: string) {
  const base = appPath(locale, "/login");

  return nextPath ? `${base}?next=${encodeURIComponent(nextPath)}` : base;
}

export function organizationPath(locale: Locale, slug: string, section = "ladder", suffix = "") {
  const encodedSlug = encodeURIComponent(slug);
  const normalizedSection = section.replace(/^\/+|\/+$/g, "");
  const normalizedSuffix = suffix ? `/${suffix.replace(/^\/+/, "")}` : "";
  const path = normalizedSection
    ? `/org/${encodedSlug}/${normalizedSection}${normalizedSuffix}`
    : `/org/${encodedSlug}`;

  return appPath(locale, path);
}

/** Reads the selected organization from a path with or without a locale prefix. */
export function organizationSlugFromPath(pathname: string) {
  const match = withoutLocale(pathname).match(organizationRoutePattern);

  if (!match) {
    return null;
  }

  try {
    return decodeURIComponent(match[1]);
  } catch {
    return null;
  }
}

/**
 * Authentication returns to organization selection, except for an invitation handoff, which must
 * survive login so the invitation is not lost.
 */
export function postAuthenticationPath(locale: Locale, requestedPath?: string | null) {
  if (requestedPath && invitationRoutePattern.test(withoutLocale(requestedPath))) {
    return requestedPath.startsWith("/") ? appPath(locale, withoutLocale(requestedPath)) : organizationsPath(locale);
  }

  return organizationsPath(locale);
}

function withoutLocale(pathname: string) {
  return pathname.startsWith("/") ? pathnameWithoutLocale(pathname) : pathname;
}
