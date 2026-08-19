"use client";

import { usePathname } from "next/navigation";
import { NavBar } from "@/components/NavBar";
import { pathnameWithoutLocale } from "@/lib/i18n/config";

export function AppChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const hasOrganizationContext = pathnameWithoutLocale(pathname).startsWith("/org/");

  return (
    <>
      {hasOrganizationContext ? <NavBar /> : null}
      {children}
    </>
  );
}
