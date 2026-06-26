"use client";

import { Bell } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

type NotificationState = {
  pendingChallenges: number;
};

export function NotificationBell() {
  const [notifications, setNotifications] = useState<NotificationState>({ pendingChallenges: 0 });

  useEffect(() => {
    let cancelled = false;

    async function loadNotifications() {
      try {
        const response = await fetch("/api/notifications", {
          cache: "no-store"
        });

        if (!response.ok) {
          return;
        }

        const data = (await response.json()) as NotificationState;

        if (!cancelled) {
          setNotifications(data);
        }
      } catch {
        if (!cancelled) {
          setNotifications({ pendingChallenges: 0 });
        }
      }
    }

    loadNotifications();

    return () => {
      cancelled = true;
    };
  }, []);

  const count = notifications.pendingChallenges;
  const label = count > 0 ? `${count} pending challenge${count === 1 ? "" : "s"}` : "No pending challenges";

  return (
    <Link
      href="/challenges"
      aria-label={label}
      title={label}
      className="relative grid h-10 w-10 place-items-center rounded-md border border-line bg-white text-stone-700 transition hover:border-court-500 hover:text-court-700"
    >
      <Bell aria-hidden="true" size={18} strokeWidth={2.2} />
      {count > 0 ? (
        <span className="absolute -right-1 -top-1 grid min-h-5 min-w-5 place-items-center rounded-full bg-red-600 px-1.5 text-[11px] font-black leading-none text-white">
          {count > 9 ? "9+" : count}
        </span>
      ) : null}
    </Link>
  );
}

