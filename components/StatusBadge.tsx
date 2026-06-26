import { ChallengeStatus } from "@prisma/client";

const styles: Record<ChallengeStatus, string> = {
  Pending: "bg-amber-100 text-amber-800",
  Accepted: "bg-sky-100 text-sky-800",
  Declined: "bg-stone-200 text-stone-700",
  Completed: "bg-emerald-100 text-emerald-800",
  Forfeit: "bg-red-100 text-red-800"
};

export function StatusBadge({ status }: { status: ChallengeStatus }) {
  return <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${styles[status]}`}>{status}</span>;
}

