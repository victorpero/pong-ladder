"use client";

import { Wrench } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useDictionary, useLocale } from "@/lib/i18n/locale-context";
import { organizationPath } from "@/lib/organization-paths";

type SessionState = {
  isAdmin: boolean;
};

export function AdminNavButton({ organizationSlug }: { organizationSlug: string }) {
  const locale = useLocale();
  const dictionary = useDictionary();
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadSession() {
      try {
        const response = await fetch(`/api/session?organization=${encodeURIComponent(organizationSlug)}`, {
          cache: "no-store"
        });

        if (!response.ok) {
          return;
        }

        const data = (await response.json()) as SessionState;

        if (!cancelled) {
          setIsAdmin(data.isAdmin);
        }
      } catch {
        if (!cancelled) {
          setIsAdmin(false);
        }
      }
    }

    loadSession();

    return () => {
      cancelled = true;
    };
  }, [organizationSlug]);

  if (!isAdmin) {
    return null;
  }

  return (
    <Link
      href={organizationPath(locale, organizationSlug, "admin")}
      aria-label={dictionary.nav.admin}
      title={dictionary.nav.admin}
      className="grid h-10 w-10 place-items-center rounded-md border border-line bg-white text-ink transition hover:border-court-500 hover:text-court-700"
    >
      <Wrench aria-hidden="true" size={18} strokeWidth={2.2} />
    </Link>
  );
}
