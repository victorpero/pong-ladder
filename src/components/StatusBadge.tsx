import { ChallengeStatus } from "@prisma/client";

const styles: Record<ChallengeStatus, string> = {
  Pending: "bg-amber-50 text-warning",
  Accepted: "bg-slate-100 text-neutral",
  Declined: "bg-slate-100 text-neutral",
  Completed: "bg-green-50 text-success",
  Forfeit: "bg-court-50 text-court-700"
};

export function StatusBadge({ status }: { status: ChallengeStatus }) {
  return <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${styles[status]}`}>{status}</span>;
}
