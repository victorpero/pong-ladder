import type { Metadata, Viewport } from "next";
import { notFound } from "next/navigation";
import { headers } from "next/headers";
import { AppChrome } from "@/components/AppChrome";
import { APP_THEME_COLOR } from "@/lib/app-metadata";
import { getAppBaseUrl } from "@/lib/app-url";
import {
  ACTIVE_PATH_HEADER,
  SUPPORTED_LOCALES,
  isSupportedLocale,
  localizePathname,
  pathnameWithoutLocale
} from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/dictionary";
import { LocaleProvider } from "@/lib/i18n/locale-context";
import { getCurrentVersion } from "@/lib/release-notes";
import "../globals.css";

export function generateMetadata({ params }: { params: { locale: string } }): Metadata {
  if (!isSupportedLocale(params.locale)) {
    return {};
  }

  const dictionary = getDictionary(params.locale);
  const activePath = headers().get(ACTIVE_PATH_HEADER);
  const unprefixedPath = activePath ? pathnameWithoutLocale(activePath) : null;

  return {
    title: dictionary.metadata.title,
    description: dictionary.metadata.description,
    applicationName: dictionary.metadata.title,
    // Names the icon on the iOS home screen and opts into the standalone shell.
    appleWebApp: {
      capable: true,
      title: dictionary.metadata.title,
      statusBarStyle: "default"
    },
    // Each language version points at itself and at every sibling, per multilingual search guidance.
    alternates: unprefixedPath
      ? {
          canonical: absoluteUrl(localizePathname(unprefixedPath, params.locale)),
          languages: Object.fromEntries(
            SUPPORTED_LOCALES.map((locale) => [locale, absoluteUrl(localizePathname(unprefixedPath, locale))])
          )
        }
      : undefined
  };
}

export const viewport: Viewport = {
  themeColor: APP_THEME_COLOR
};

export default function LocaleLayout({
  children,
  params
}: {
  children: React.ReactNode;
  params: { locale: string };
}) {
  if (!isSupportedLocale(params.locale)) {
    notFound();
  }

  const dictionary = getDictionary(params.locale);

  return (
    <html lang={params.locale}>
      <body>
        <LocaleProvider locale={params.locale} dictionary={dictionary}>
          {/* Resolved on the server so the release notes never ship to the browser just to print a version. */}
          <AppChrome version={getCurrentVersion()}>{children}</AppChrome>
        </LocaleProvider>
      </body>
    </html>
  );
}

function absoluteUrl(path: string) {
  try {
    return new URL(path, getAppBaseUrl()).toString();
  } catch {
    return path;
  }
}
