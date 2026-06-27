"use client";

import { Bell } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

type NotificationState = {
  pendingChallenges: number;
  challenges: Array<{
    id: string;
    challengerName: string;
  }>;
};

export function NotificationBell() {
  const [notifications, setNotifications] = useState<NotificationState>({ pendingChallenges: 0, challenges: [] });
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

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
          setNotifications({ pendingChallenges: 0, challenges: [] });
        }
      }
    }

    loadNotifications();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    function closeOnOutsideClick(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", closeOnOutsideClick);
    document.addEventListener("keydown", closeOnEscape);

    return () => {
      document.removeEventListener("mousedown", closeOnOutsideClick);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, []);

  const count = notifications.pendingChallenges;
  const label = count > 0 ? `${count} pending challenge${count === 1 ? "" : "s"}` : "No notifications";

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        aria-label={label}
        aria-expanded={isOpen}
        title={label}
        onClick={() => setIsOpen((open) => !open)}
        className="relative grid h-10 w-10 place-items-center rounded-md border border-line bg-white text-stone-700 transition hover:border-court-500 hover:text-court-700"
      >
        <Bell aria-hidden="true" size={18} strokeWidth={2.2} />
        {count > 0 ? (
          <span className="absolute -right-1 -top-1 grid min-h-5 min-w-5 place-items-center rounded-full bg-red-600 px-1.5 text-[11px] font-black leading-none text-white">
            {count > 9 ? "9+" : count}
          </span>
        ) : null}
      </button>

      {isOpen ? (
        <div className="absolute right-0 top-12 z-50 w-72 rounded-lg border border-line bg-white p-2 shadow-soft">
          <p className="px-3 py-2 text-xs font-black uppercase tracking-wide text-stone-500">Notifications</p>
          {notifications.challenges.length === 0 ? (
            <p className="rounded-md px-3 py-4 text-sm font-semibold text-stone-500">No notifications</p>
          ) : (
            <div className="grid gap-1">
              {notifications.challenges.map((challenge) => (
                <Link
                  key={challenge.id}
                  href={`/challenges#${challenge.id}`}
                  onClick={() => setIsOpen(false)}
                  className="rounded-md px-3 py-2 text-sm transition hover:bg-stone-50"
                >
                  <span className="font-black text-stone-900">{challenge.challengerName}</span>{" "}
                  <span className="font-bold text-stone-500">challenges</span>{" "}
                  <span className="font-black text-stone-900">you</span>
                </Link>
              ))}
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}
