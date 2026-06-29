import Link from "next/link";
import { LogOut, UserCircle } from "lucide-react";
import { AdminNavButton } from "@/components/AdminNavButton";
import { LogoMark } from "@/components/LogoMark";
import { NotificationBell } from "@/components/NotificationBell";

const links = [
  ["Ladder", "/ladder"],
  ["Matches", "/matches"],
  ["Challenges", "/challenges"],
  ["Teams", "/teams"],
  ["Players", "/players"],
  ["Rules", "/rules"]
];

export function NavBar() {
  return (
    <header className="relative z-50 border-b border-line bg-white/90 backdrop-blur">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-3 px-4 py-4 sm:px-6 lg:px-8">
        <Link href="/ladder" className="flex items-center gap-3">
          <LogoMark />
          <span>
            <span className="block text-lg font-black leading-tight">Pong Ladder</span>
            <span className="block text-xs font-medium text-stone-500">Season rankings and challenge play</span>
          </span>
        </Link>
        <div className="flex items-center gap-3">
          <nav aria-label="Primary navigation" className="flex flex-1 gap-2 overflow-x-auto pb-1">
            {links.map(([label, href]) => (
              <Link
                key={href}
                href={href}
                className="rounded-md border border-line bg-white px-3 py-2 text-sm font-semibold text-stone-700 transition hover:border-court-500 hover:text-court-700"
              >
                {label}
              </Link>
            ))}
          </nav>
          <nav aria-label="Account navigation" className="ml-auto flex shrink-0 gap-2 pb-1">
            <NotificationBell />
            <AdminNavButton />
            <Link
              href="/account"
              aria-label="My account"
              title="My account"
              className="grid h-10 w-10 place-items-center rounded-md border border-line bg-white text-stone-700 transition hover:border-court-500 hover:text-court-700"
            >
              <UserCircle aria-hidden="true" size={19} strokeWidth={2.2} />
            </Link>
            <Link
              href="/logout"
              aria-label="Log out"
              title="Log out"
              className="grid h-10 w-10 place-items-center rounded-md border border-line bg-white text-stone-700 transition hover:border-red-300 hover:text-red-700"
            >
              <LogOut aria-hidden="true" size={18} strokeWidth={2.2} />
            </Link>
          </nav>
        </div>
      </div>
    </header>
  );
}
