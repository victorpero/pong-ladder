import { describe, expect, it } from "vitest";
import {
  DEFAULT_LOCALE,
  isSupportedLocale,
  localeFromAcceptLanguage,
  localeFromCookieHeader,
  localeFromPathname,
  localizePathname,
  localizeUrl,
  pathnameWithoutLocale,
  resolveLocale,
  toSupportedLocale
} from "@/lib/i18n/config";

describe("locale validation", () => {
  it("accepts only the supported language tags", () => {
    expect(isSupportedLocale("sv")).toBe(true);
    expect(isSupportedLocale("en")).toBe(true);
    expect(isSupportedLocale("de")).toBe(false);
    expect(isSupportedLocale("EN")).toBe(false);
    expect(isSupportedLocale("polisen")).toBe(false);
    expect(isSupportedLocale(undefined)).toBe(false);
  });

  it("falls back safely instead of passing an unknown value on", () => {
    expect(toSupportedLocale("en")).toBe("en");
    expect(toSupportedLocale("../../etc/passwd")).toBe(DEFAULT_LOCALE);
  });

  it("reads a locale segment only when the segment is a supported language", () => {
    expect(localeFromPathname("/sv/org/polisen/ladder")).toBe("sv");
    expect(localeFromPathname("/en/login")).toBe("en");
    expect(localeFromPathname("/org/polisen/ladder")).toBeNull();
    expect(localeFromPathname("/de/org/polisen")).toBeNull();
  });
});

describe("locale resolution order", () => {
  it("treats an explicit locale in the address as authoritative", () => {
    expect(
      resolveLocale({
        pathLocale: "en",
        userPreference: "sv",
        guestPreference: "sv",
        organizationDefault: "sv",
        acceptLanguage: "sv-SE"
      })
    ).toBe("en");
  });

  it("prefers the signed-in preference over a guest cookie and the organization default", () => {
    expect(
      resolveLocale({ userPreference: "en", guestPreference: "sv", organizationDefault: "sv" })
    ).toBe("en");
  });

  it("prefers a stored guest choice over the organization default", () => {
    expect(resolveLocale({ guestPreference: "en", organizationDefault: "sv" })).toBe("en");
  });

  it("uses the organization default before the browser preference", () => {
    expect(resolveLocale({ organizationDefault: "sv", acceptLanguage: "en-GB,en;q=0.9" })).toBe("sv");
  });

  it("uses the browser preference when nothing has been chosen", () => {
    expect(resolveLocale({ acceptLanguage: "en-GB,en;q=0.9" })).toBe("en");
    expect(resolveLocale({ acceptLanguage: "de-DE,de;q=0.9,en;q=0.4" })).toBe("en");
  });

  it("falls back to Swedish when no source is usable", () => {
    expect(resolveLocale({})).toBe("sv");
    expect(resolveLocale({ userPreference: "de", acceptLanguage: "fr-FR,fr;q=0.9" })).toBe("sv");
    expect(DEFAULT_LOCALE).toBe("sv");
  });

  it("ignores unsupported languages in the browser header", () => {
    expect(localeFromAcceptLanguage("de-DE,de;q=0.9")).toBeNull();
    expect(localeFromAcceptLanguage("")).toBeNull();
    expect(localeFromAcceptLanguage("en;q=0")).toBeNull();
  });

  it("reads a stored preference from a cookie header", () => {
    expect(localeFromCookieHeader("other=1; pong-ladder-locale=en")).toBe("en");
    expect(localeFromCookieHeader("pong-ladder-locale=de")).toBeNull();
    expect(localeFromCookieHeader(null)).toBeNull();
  });
});

describe("switching language", () => {
  it("changes only the locale segment of a path", () => {
    expect(localizePathname("/org/polisen/ladder", "sv")).toBe("/sv/org/polisen/ladder");
    expect(localizePathname("/sv/org/polisen/ladder", "en")).toBe("/en/org/polisen/ladder");
    expect(localizePathname("/", "en")).toBe("/en");
  });

  it("keeps the organization, page, query string, and fragment", () => {
    expect(localizeUrl("/sv/org/polisen/matches?challengeId=abc", "en")).toBe(
      "/en/org/polisen/matches?challengeId=abc"
    );
    expect(localizeUrl("/sv/org/polisen/challenges#challenge-1", "en")).toBe(
      "/en/org/polisen/challenges#challenge-1"
    );
    expect(localizeUrl("/sv/org/polisen/players/player-1?tab=stats#head", "en")).toBe(
      "/en/org/polisen/players/player-1?tab=stats#head"
    );
  });

  it("strips the locale without losing the rest of the path", () => {
    expect(pathnameWithoutLocale("/en/org/polisen/ladder")).toBe("/org/polisen/ladder");
    expect(pathnameWithoutLocale("/org/polisen/ladder")).toBe("/org/polisen/ladder");
    expect(pathnameWithoutLocale("/sv")).toBe("/");
  });
});
