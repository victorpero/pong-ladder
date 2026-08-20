import { ChallengeStatus } from "@prisma/client";
import type { Locale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/dictionary";

const styles: Record<ChallengeStatus, string> = {
  Pending: "bg-amber-50 text-warning",
  Accepted: "bg-slate-100 text-neutral",
  Declined: "bg-slate-100 text-neutral",
  Completed: "bg-green-50 text-success",
  Forfeit: "bg-court-50 text-court-700"
};

export function StatusBadge({ status, locale }: { status: ChallengeStatus; locale: Locale }) {
  return (
    <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${styles[status]}`}>
      {getDictionary(locale).challenges.status[status]}
    </span>
  );
}
