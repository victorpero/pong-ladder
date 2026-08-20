export const SUPPORTED_LOCALES = ["sv", "en"] as const;

export type Locale = (typeof SUPPORTED_LOCALES)[number];

// Swedish is the product default: the launch organization plays in Swedish.
export const DEFAULT_LOCALE: Locale = "sv";

export const LOCALE_COOKIE_NAME = "pong-ladder-locale";

/** Middleware forwards the active path so localized pages can build canonical and hreflang links. */
export const ACTIVE_PATH_HEADER = "x-pong-ladder-path";
export const LOCALE_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 365;

// Native language names, because a language is not the same thing as a country.
export const LOCALE_NATIVE_NAMES: Record<Locale, string> = {
  sv: "Svenska",
  en: "English"
};

export const LOCALE_SHORT_LABELS: Record<Locale, string> = {
  sv: "SV",
  en: "EN"
};

export function isSupportedLocale(value: unknown): value is Locale {
  return typeof value === "string" && SUPPORTED_LOCALES.includes(value as Locale);
}

/** Narrows any input to a supported locale so an unknown segment can never reach a dictionary lookup. */
export function toSupportedLocale(value: unknown, fallback: Locale = DEFAULT_LOCALE): Locale {
  return isSupportedLocale(value) ? value : fallback;
}

/** Reads the locale from a leading path segment, or null when the path is unprefixed. */
export function localeFromPathname(pathname: string): Locale | null {
  const segment = pathname.split("/")[1];

  return isSupportedLocale(segment) ? segment : null;
}

/** Returns the path without its locale segment, always keeping a leading slash. */
export function pathnameWithoutLocale(pathname: string) {
  const locale = localeFromPathname(pathname);

  if (!locale) {
    return pathname || "/";
  }

  const rest = pathname.slice(locale.length + 1);

  return rest.startsWith("/") ? rest : `/${rest}`;
}

/** Rewrites any path so it is served by the given locale, replacing an existing prefix. */
export function localizePathname(pathname: string, locale: Locale) {
  const unprefixed = pathnameWithoutLocale(pathname.startsWith("/") ? pathname : `/${pathname}`);

  return unprefixed === "/" ? `/${locale}` : `/${locale}${unprefixed}`;
}

/**
 * Switches the locale of a full relative URL, preserving path, query string, and fragment so a
 * language change keeps the reader exactly where they were.
 */
export function localizeUrl(url: string, locale: Locale) {
  const [pathAndQuery = "", fragment = ""] = splitOnce(url, "#");
  const [pathname = "", query = ""] = splitOnce(pathAndQuery, "?");

  return `${localizePathname(pathname || "/", locale)}${query ? `?${query}` : ""}${fragment ? `#${fragment}` : ""}`;
}

/** Picks the first supported language from an Accept-Language header, ignoring unsupported entries. */
export function localeFromAcceptLanguage(header: string | null | undefined): Locale | null {
  if (!header) {
    return null;
  }

  const ranked = header
    .split(",")
    .map((part) => {
      const [tag = "", ...parameters] = part.trim().split(";");
      const quality = parameters
        .map((parameter) => parameter.trim())
        .find((parameter) => parameter.startsWith("q="));
      const parsedQuality = quality ? Number.parseFloat(quality.slice(2)) : 1;

      return {
        language: tag.trim().toLowerCase().split("-")[0],
        quality: Number.isFinite(parsedQuality) ? parsedQuality : 0
      };
    })
    .filter((entry) => entry.language.length > 0 && entry.quality > 0)
    .sort((left, right) => right.quality - left.quality);

  return ranked.find((entry) => isSupportedLocale(entry.language))?.language as Locale | undefined ?? null;
}

/** Reads the stored preference straight from a Cookie header, for handlers outside the app router. */
export function localeFromCookieHeader(header: string | null | undefined): Locale | null {
  if (!header) {
    return null;
  }

  for (const part of header.split(";")) {
    const [name, ...rest] = part.trim().split("=");

    if (name === LOCALE_COOKIE_NAME) {
      const value = decodeURIComponent(rest.join("="));

      return isSupportedLocale(value) ? value : null;
    }
  }

  return null;
}

export type LocaleResolutionInput = {
  /** An explicit locale from the URL always wins and is never silently replaced. */
  pathLocale?: string | null;
  userPreference?: string | null;
  guestPreference?: string | null;
  organizationDefault?: string | null;
  acceptLanguage?: string | null;
};

/**
 * Resolves the active locale for a request. The order is deliberate: an explicit URL first, then the
 * signed-in preference, a stored guest preference, the organization default, the browser, and
 * finally Swedish.
 */
export function resolveLocale({
  pathLocale,
  userPreference,
  guestPreference,
  organizationDefault,
  acceptLanguage
}: LocaleResolutionInput): Locale {
  const candidates = [pathLocale, userPreference, guestPreference, organizationDefault];

  for (const candidate of candidates) {
    if (isSupportedLocale(candidate)) {
      return candidate;
    }
  }

  return localeFromAcceptLanguage(acceptLanguage) ?? DEFAULT_LOCALE;
}

function splitOnce(value: string, separator: string) {
  const index = value.indexOf(separator);

  return index === -1 ? [value, ""] : [value.slice(0, index), value.slice(index + 1)];
}
