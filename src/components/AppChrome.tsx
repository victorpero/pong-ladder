"use client";

import { usePathname } from "next/navigation";
import { NavBar } from "@/components/NavBar";

export function AppChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const hasOrganizationContext = pathname.startsWith("/org/");

  return (
    <>
      {hasOrganizationContext ? <NavBar /> : null}
      {children}
    </>
  );
}
