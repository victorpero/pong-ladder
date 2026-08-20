/**
 * Selection rules for the challenges a player still has to play and report.
 *
 * The ladder cards and the challenge board must agree on what "active" means, so
 * both derive from these helpers instead of repeating the status checks. The
 * module stays free of `@prisma/client` imports because the ladder cards run in
 * the browser; `reportableChallengeStatus` mirrors `ChallengeStatus.Accepted`
 * and a test keeps the two in step.
 */
export const reportableChallengeStatus = "Accepted";

export type ReportableChallenge = {
  status: string;
  challengerId: string;
  challengedId: string;
};

/**
 * Only an accepted challenge can carry a result: pending ones have no agreed
 * match yet, and completed, declined or forfeited ones are already closed.
 */
export function isReportableChallenge(challenge: ReportableChallenge, viewerId: string) {
  return (
    challenge.status === reportableChallengeStatus &&
    (challenge.challengerId === viewerId || challenge.challengedId === viewerId)
  );
}

export function getChallengeOpponentId(challenge: ReportableChallenge, viewerId: string) {
  if (challenge.challengerId === viewerId) {
    return challenge.challengedId;
  }

  if (challenge.challengedId === viewerId) {
    return challenge.challengerId;
  }

  return null;
}

export function selectReportableChallenges<T extends ReportableChallenge>(challenges: T[], viewerId?: string | null) {
  if (!viewerId) {
    return [];
  }

  return challenges.filter((challenge) => isReportableChallenge(challenge, viewerId));
}

/** The card asks who won, and the match mutation expects an explicit winner and loser. */
export function resolveMatchParticipants({
  viewerId,
  opponentId,
  winner
}: {
  viewerId: string;
  opponentId: string;
  winner: "viewer" | "opponent";
}) {
  return winner === "viewer"
    ? { winnerId: viewerId, loserId: opponentId }
    : { winnerId: opponentId, loserId: viewerId };
}
