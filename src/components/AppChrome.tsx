"use client";

import { usePathname } from "next/navigation";
import { AppFooter } from "@/components/AppFooter";
import { NavBar } from "@/components/NavBar";
import { pathnameWithoutLocale } from "@/lib/i18n/config";
import { useLocale } from "@/lib/i18n/locale-context";
import { changelogPathForPathname } from "@/lib/navigation";

export function AppChrome({ version, children }: { version: string; children: React.ReactNode }) {
  const pathname = usePathname();
  const locale = useLocale();
  const hasOrganizationContext = pathnameWithoutLocale(pathname).startsWith("/org/");

  return (
    <div className="flex min-h-screen flex-col">
      {hasOrganizationContext ? <NavBar /> : null}
      <div className="flex-1">{children}</div>
      <AppFooter version={version} changelogHref={changelogPathForPathname(locale, pathname)} />
    </div>
  );
}
