"use client";

import Link from "next/link";
import { LogOut, UserCircle, UserPlus, Wrench } from "lucide-react";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { LanguageSelector } from "@/components/LanguageSelector";
import { LogoMark } from "@/components/LogoMark";
import { NotificationBell } from "@/components/NotificationBell";
import { OrganizationSwitcher } from "@/components/OrganizationSwitcher";
import { logout } from "@/lib/auth-actions";
import { useDictionary, useLocale } from "@/lib/i18n/locale-context";
import { organizationPath, organizationSlugFromPath, organizationsPath } from "@/lib/organization-paths";

const sections = ["ladder", "matches", "challenges", "teams", "players", "rules"] as const;

type SessionState = {
  isAdmin: boolean;
  isApproved: boolean;
};

export function NavBar() {
  const pathname = usePathname();
  const locale = useLocale();
  const dictionary = useDictionary();
  const organizationSlug = organizationSlugFromPath(pathname);
  const [session, setSession] = useState<SessionState>({ isAdmin: false, isApproved: false });

  useEffect(() => {
    let cancelled = false;

    setSession({ isAdmin: false, isApproved: false });

    if (!organizationSlug) {
      return () => {
        cancelled = true;
      };
    }

    const activeOrganizationSlug = organizationSlug;

    async function loadSession() {
      try {
        const response = await fetch(`/api/session?organization=${encodeURIComponent(activeOrganizationSlug)}`, {
          cache: "no-store"
        });

        if (!response.ok) {
          return;
        }

        const data = (await response.json()) as SessionState;

        if (!cancelled) {
          setSession(data);
        }
      } catch {
        if (!cancelled) {
          setSession({ isAdmin: false, isApproved: false });
        }
      }
    }

    loadSession();

    return () => {
      cancelled = true;
    };
  }, [organizationSlug]);

  if (!organizationSlug) {
    return null;
  }

  return (
    <header className="relative z-50 border-b border-line bg-white">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-3 px-4 py-4 sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-center gap-3">
          <Link href={organizationsPath(locale)} className="flex items-center gap-3">
            <LogoMark />
            <span>
              <span className="block text-lg font-black leading-tight">Pong Ladder</span>
            </span>
          </Link>
          <span className="hidden text-line sm:block">/</span>
          <OrganizationSwitcher currentSlug={organizationSlug} />
          <div className="ml-auto flex items-center gap-2">
            <LanguageSelector />
            {session.isApproved ? (
              <Link
                href={organizationPath(locale, organizationSlug, "invite")}
                className="inline-flex h-10 items-center gap-2 rounded-md border border-line bg-white px-3 text-sm font-semibold text-ink transition hover:border-court-500 hover:text-court-700"
              >
                <UserPlus aria-hidden="true" size={17} strokeWidth={2.2} />
                {dictionary.nav.invite}
              </Link>
            ) : null}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <nav aria-label={dictionary.nav.primary} className="flex flex-1 gap-2 overflow-x-auto pb-1">
            {sections.map((section) => {
              const href = organizationPath(locale, organizationSlug, section);

              return (
                <Link
                  key={href}
                  href={href}
                  className="rounded-md border border-line bg-white px-3 py-2 text-sm font-semibold text-ink transition hover:border-court-500 hover:text-court-700"
                >
                  {dictionary.nav[section]}
                </Link>
              );
            })}
          </nav>
          <nav aria-label={dictionary.nav.account} className="ml-auto flex shrink-0 gap-2 pb-1">
            {session.isAdmin ? (
              <Link
                href={organizationPath(locale, organizationSlug, "admin")}
                aria-label={dictionary.nav.admin}
                title={dictionary.nav.admin}
                className="grid h-10 w-10 place-items-center rounded-md border border-line bg-white text-ink transition hover:border-court-500 hover:text-court-700"
              >
                <Wrench aria-hidden="true" size={18} strokeWidth={2.2} />
              </Link>
            ) : null}
            <NotificationBell organizationSlug={organizationSlug} />
            <Link
              href={organizationPath(locale, organizationSlug, "account")}
              aria-label={dictionary.nav.myAccount}
              title={dictionary.nav.myAccount}
              className="grid h-10 w-10 place-items-center rounded-md border border-line bg-white text-ink transition hover:border-court-500 hover:text-court-700"
            >
              <UserCircle aria-hidden="true" size={19} strokeWidth={2.2} />
            </Link>
            <form action={logout}>
              <button
                type="submit"
                aria-label={dictionary.nav.logout}
                title={dictionary.nav.logout}
                className="grid h-10 w-10 place-items-center rounded-md border border-line bg-white text-neutral transition hover:border-court-200 hover:text-court-700"
              >
                <LogOut aria-hidden="true" size={18} strokeWidth={2.2} />
              </button>
            </form>
          </nav>
        </div>
      </div>
    </header>
  );
}
