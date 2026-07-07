"use client";

import { usePathname } from "next/navigation";
import { NavBar } from "@/components/NavBar";

export function AppChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAuthScreen = pathname === "/login" || pathname === "/awaiting-approval";

  return (
    <>
      {isAuthScreen ? null : <NavBar />}
      {children}
    </>
  );
}
