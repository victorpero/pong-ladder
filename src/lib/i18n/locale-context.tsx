"use client";

import { createContext, useContext } from "react";
import type { Locale } from "@/lib/i18n/config";
import type { Dictionary } from "@/lib/i18n/dictionaries/en";

type LocaleContextValue = {
  locale: Locale;
  dictionary: Dictionary;
};

const LocaleContext = createContext<LocaleContextValue | null>(null);

/**
 * Hands the active locale and its dictionary to client components. The locale layout resolves both
 * on the server, so a client bundle never needs to carry every translation.
 */
export function LocaleProvider({
  locale,
  dictionary,
  children
}: LocaleContextValue & { children: React.ReactNode }) {
  return <LocaleContext.Provider value={{ locale, dictionary }}>{children}</LocaleContext.Provider>;
}

function useLocaleContext() {
  const context = useContext(LocaleContext);

  if (!context) {
    throw new Error("useLocale must be used inside a locale layout.");
  }

  return context;
}

export function useLocale() {
  return useLocaleContext().locale;
}

export function useDictionary() {
  return useLocaleContext().dictionary;
}
