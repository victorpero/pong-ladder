"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { releaseAcknowledgedEvent } from "@/components/ReleaseAcknowledgement";
import { useDictionary } from "@/lib/i18n/locale-context";
import { formatVersionLabel, hasUnseenRelease, lastSeenReleaseStorageKey } from "@/lib/version";

/**
 * The version lives here rather than in primary navigation: discoverable on
 * every page, but never competing with the ladder for attention.
 */
export function AppFooter({ version, changelogHref }: { version: string; changelogHref: string }) {
  const dictionary = useDictionary();
  // Resolved after mount so the server-rendered markup never disagrees with
  // what this particular browser has stored.
  const [showIndicator, setShowIndicator] = useState(false);

  useEffect(() => {
    function syncIndicator() {
      try {
        setShowIndicator(hasUnseenRelease(version, window.localStorage.getItem(lastSeenReleaseStorageKey)));
      } catch {
        setShowIndicator(false);
      }
    }

    syncIndicator();
    window.addEventListener(releaseAcknowledgedEvent, syncIndicator);

    return () => {
      window.removeEventListener(releaseAcknowledgedEvent, syncIndicator);
    };
  }, [version]);

  return (
    <footer className="border-t border-line bg-white">
      <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-4 text-sm sm:px-6 lg:px-8">
        <Link
          href={changelogHref}
          className="inline-flex items-center gap-2 font-semibold text-muted transition hover:text-court-700"
        >
          {formatVersionLabel(version, {
            isProduction: process.env.NODE_ENV === "production",
            developmentLabel: dictionary.footer.developmentBuild
          })}
          {showIndicator ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-court-700 px-2 py-0.5 text-xs font-black text-white">
              <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-white" />
              {dictionary.footer.newBadge}
            </span>
          ) : null}
        </Link>
        <Link href={changelogHref} className="font-semibold text-muted transition hover:text-court-700">
          {dictionary.footer.whatsNew}
        </Link>
      </div>
    </footer>
  );
}
