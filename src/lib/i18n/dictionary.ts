import { en, type Dictionary } from "@/lib/i18n/dictionaries/en";
import { sv } from "@/lib/i18n/dictionaries/sv";
import { toSupportedLocale, type Locale } from "@/lib/i18n/config";

const dictionaries: Record<Locale, Dictionary> = { sv, en };

/** Validates the locale before the lookup, so an unknown segment can never select a dictionary. */
export function getDictionary(locale: unknown): Dictionary {
  return dictionaries[toSupportedLocale(locale)];
}

export type { Dictionary };
