"use client";

import { Check, Globe } from "lucide-react";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  LOCALE_NATIVE_NAMES,
  LOCALE_SHORT_LABELS,
  SUPPORTED_LOCALES,
  localizeUrl
} from "@/lib/i18n/config";
import { t } from "@/lib/i18n/format";
import { useDictionary, useLocale } from "@/lib/i18n/locale-context";
import { changeLanguage } from "@/lib/locale-actions";

/**
 * Compact language control for the organization header. Each option is a real submit button, so the
 * choice is stored and followed even without client-side JavaScript.
 */
export function LanguageSelector({ className = "" }: { className?: string }) {
  const locale = useLocale();
  const dictionary = useDictionary();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function closeOnOutsideClick(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", closeOnOutsideClick);
    document.addEventListener("keydown", closeOnEscape);

    return () => {
      document.removeEventListener("mousedown", closeOnOutsideClick);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, []);

  const query = searchParams.toString();
  const currentUrl = `${pathname}${query ? `?${query}` : ""}`;

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <button
        type="button"
        aria-expanded={isOpen}
        aria-haspopup="menu"
        aria-label={`${dictionary.language.selectorLabel}. ${t(dictionary.language.currentLabel, {
          language: LOCALE_NATIVE_NAMES[locale]
        })}`}
        title={dictionary.language.selectorLabel}
        onClick={() => setIsOpen(!isOpen)}
        className="inline-flex h-10 items-center gap-1.5 rounded-md border border-line bg-white px-2.5 text-sm font-semibold text-muted outline-none transition hover:border-court-500 hover:text-court-700 focus-visible:ring-2 focus-visible:ring-court-500 focus-visible:ring-offset-1"
      >
        <Globe aria-hidden="true" size={17} strokeWidth={2.2} />
        <span aria-hidden="true">{LOCALE_SHORT_LABELS[locale]}</span>
      </button>

      {isOpen ? (
        <div
          role="menu"
          aria-label={dictionary.language.label}
          className="absolute right-0 top-12 z-50 w-44 rounded-lg border border-line bg-white p-1 shadow-soft"
        >
          {SUPPORTED_LOCALES.map((option) => {
            const isCurrent = option === locale;

            return (
              <form action={changeLanguage} key={option}>
                <input type="hidden" name="locale" value={option} />
                <input type="hidden" name="target" value={localizeUrl(currentUrl, option)} />
                <button
                  type="submit"
                  role="menuitem"
                  aria-current={isCurrent ? "true" : undefined}
                  aria-label={t(dictionary.language.optionLabel, { language: LOCALE_NATIVE_NAMES[option] })}
                  className={`flex w-full items-center justify-between gap-2 rounded-md px-3 py-2 text-left text-sm font-semibold outline-none transition hover:bg-slate-50 focus-visible:ring-2 focus-visible:ring-court-500 ${
                    isCurrent ? "text-court-700" : "text-ink"
                  }`}
                >
                  {LOCALE_NATIVE_NAMES[option]}
                  {isCurrent ? <Check aria-hidden="true" size={16} strokeWidth={2.6} /> : null}
                </button>
              </form>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
