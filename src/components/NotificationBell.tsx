"use client";

import { Bell } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

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
  const isMountedRef = useRef(false);

  const loadNotifications = useCallback(async () => {
    try {
      const response = await fetch("/api/notifications", {
        cache: "no-store"
      });

      if (!response.ok) {
        return;
      }

      const data = (await response.json()) as NotificationState;

      if (isMountedRef.current) {
        setNotifications(data);
      }
    } catch {
      if (isMountedRef.current) {
        setNotifications({ pendingChallenges: 0, challenges: [] });
      }
    }
  }, []);

  useEffect(() => {
    isMountedRef.current = true;
    loadNotifications();

    return () => {
      isMountedRef.current = false;
    };
  }, [loadNotifications]);

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

  useEffect(() => {
    function refreshAfterChallengeResponse(event: SubmitEvent) {
      const form = event.target;

      if (!(form instanceof HTMLFormElement) || !form.querySelector('input[name="challengeId"]')) {
        return;
      }

      window.setTimeout(loadNotifications, 500);
      window.setTimeout(loadNotifications, 1500);
      window.setTimeout(loadNotifications, 3000);
    }

    document.addEventListener("submit", refreshAfterChallengeResponse);
    window.addEventListener("focus", loadNotifications);
    const intervalId = window.setInterval(loadNotifications, 15000);

    return () => {
      document.removeEventListener("submit", refreshAfterChallengeResponse);
      window.removeEventListener("focus", loadNotifications);
      window.clearInterval(intervalId);
    };
  }, [loadNotifications]);

  const count = notifications.pendingChallenges;
  const label = count > 0 ? `${count} pending challenge${count === 1 ? "" : "s"}` : "No notifications";

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        aria-label={label}
        aria-expanded={isOpen}
        title={label}
        onClick={() => {
          const nextIsOpen = !isOpen;
          setIsOpen(nextIsOpen);

          if (nextIsOpen) {
            void loadNotifications();
          }
        }}
        className="relative grid h-10 w-10 place-items-center rounded-md border border-line bg-white text-ink transition hover:border-court-500 hover:text-court-700"
      >
        <Bell aria-hidden="true" size={18} strokeWidth={2.2} />
        {count > 0 ? (
          <span className="absolute -right-1 -top-1 grid min-h-5 min-w-5 place-items-center rounded-full bg-court-500 px-1.5 text-[11px] font-black leading-none text-white">
            {count > 9 ? "9+" : count}
          </span>
        ) : null}
      </button>

      {isOpen ? (
        <div className="absolute right-0 top-12 z-50 w-72 rounded-lg border border-line bg-white p-2 shadow-soft">
          <p className="px-3 py-2 text-xs font-black uppercase tracking-wide text-muted">Notifications</p>
          {notifications.challenges.length === 0 ? (
            <p className="rounded-md px-3 py-4 text-sm font-semibold text-muted">No notifications</p>
          ) : (
            <div className="grid gap-1">
              {notifications.challenges.map((challenge) => (
                <Link
                  key={challenge.id}
                  href={`/challenges#${challenge.id}`}
                  onClick={() => setIsOpen(false)}
                  className="rounded-md px-3 py-2 text-sm transition hover:bg-slate-50"
                >
                  <span className="font-black text-ink">{challenge.challengerName}</span>{" "}
                  <span className="font-bold text-muted">challenges</span>{" "}
                  <span className="font-black text-ink">you</span>
                </Link>
              ))}
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}
