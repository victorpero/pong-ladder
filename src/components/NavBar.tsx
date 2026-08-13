"use client";

import Link from "next/link";
import { LogOut, UserCircle } from "lucide-react";
import { usePathname } from "next/navigation";
import { AdminNavButton } from "@/components/AdminNavButton";
import { LogoMark } from "@/components/LogoMark";
import { NotificationBell } from "@/components/NotificationBell";
import { OrganizationSwitcher } from "@/components/OrganizationSwitcher";
import { logout } from "@/lib/auth-actions";
import { organizationPath, organizationSlugFromPath, organizationsPath } from "@/lib/organization-paths";

const links = [
  ["Ladder", "ladder"],
  ["Matches", "matches"],
  ["Challenges", "challenges"],
  ["Teams", "teams"],
  ["Players", "players"],
  ["Rules", "rules"]
];

export function NavBar() {
  const pathname = usePathname();
  const organizationSlug = organizationSlugFromPath(pathname);

  if (!organizationSlug) {
    return null;
  }

  return (
    <header className="relative z-50 border-b border-line bg-white">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-3 px-4 py-4 sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-center gap-3">
          <Link href={organizationsPath} className="flex items-center gap-3">
            <LogoMark />
            <span>
              <span className="block text-lg font-black leading-tight">Pong Ladder</span>
            </span>
          </Link>
          <span className="hidden text-line sm:block">/</span>
          <OrganizationSwitcher currentSlug={organizationSlug} />
        </div>
        <div className="flex items-center gap-3">
          <nav aria-label="Primary navigation" className="flex flex-1 gap-2 overflow-x-auto pb-1">
            {links.map(([label, section]) => {
              const href = organizationPath(organizationSlug, section);

              return (
                <Link
                  key={href}
                  href={href}
                  className="rounded-md border border-line bg-white px-3 py-2 text-sm font-semibold text-ink transition hover:border-court-500 hover:text-court-700"
                >
                  {label}
                </Link>
              );
            })}
          </nav>
          <nav aria-label="Account navigation" className="ml-auto flex shrink-0 gap-2 pb-1">
            <NotificationBell organizationSlug={organizationSlug} />
            <AdminNavButton organizationSlug={organizationSlug} />
            <Link
              href={organizationPath(organizationSlug, "account")}
              aria-label="My account"
              title="My account"
              className="grid h-10 w-10 place-items-center rounded-md border border-line bg-white text-ink transition hover:border-court-500 hover:text-court-700"
            >
              <UserCircle aria-hidden="true" size={19} strokeWidth={2.2} />
            </Link>
            <form action={logout}>
              <button
                type="submit"
                aria-label="Log out"
                title="Log out"
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
