import { ChallengeStatus, type Prisma } from "@prisma/client";
import { maxChallengeDistance } from "@/lib/ladder-positions";

export type ChallengeRulePlayer = {
  effectivePosition: number;
};

/** States that represent an ongoing matchup and therefore block a second challenge. */
export const activeChallengeStatuses = [ChallengeStatus.Pending, ChallengeStatus.Accepted];

/**
 * A matchup is unordered: an active challenge blocks a new one in either
 * direction until it is completed, declined or forfeited.
 */
export function activeChallengeBetweenWhere(seasonId: string, playerId: string, opponentId: string): Prisma.ChallengeWhereInput {
  return {
    seasonId,
    status: { in: activeChallengeStatuses },
    OR: [
      { challengerId: playerId, challengedId: opponentId },
      { challengerId: opponentId, challengedId: playerId }
    ]
  };
}

export function activeChallengesForPlayerWhere(seasonId: string, playerId: string): Prisma.ChallengeWhereInput {
  return {
    seasonId,
    status: { in: activeChallengeStatuses },
    OR: [{ challengerId: playerId }, { challengedId: playerId }]
  };
}

export function isActiveChallenge(challenge: { status: ChallengeStatus | string }) {
  return activeChallengeStatuses.some((status) => status === challenge.status);
}

/** Opponents the player is already tied up with, regardless of who opened the challenge. */
export function getActiveChallengeOpponentIds(
  challenges: Array<{ challengerId: string; challengedId: string; status: ChallengeStatus | string }>,
  playerId: string
) {
  const opponentIds = new Set<string>();

  for (const challenge of challenges) {
    if (!isActiveChallenge(challenge)) {
      continue;
    }

    if (challenge.challengerId === playerId) {
      opponentIds.add(challenge.challengedId);
    } else if (challenge.challengedId === playerId) {
      opponentIds.add(challenge.challengerId);
    }
  }

  return Array.from(opponentIds);
}

/**
 * Distance is measured between effective positions, so players level on points
 * share one position and get the same reach. A distance of zero is a matchup
 * between tied players; callers exclude the challenger from their own targets.
 */
export function canChallengePlayer(challenger: ChallengeRulePlayer, challenged: ChallengeRulePlayer) {
  const positionDistance = Math.abs(challenger.effectivePosition - challenged.effectivePosition);

  return positionDistance <= maxChallengeDistance;
}

export const challengeWindowMessage =
  "A player may only challenge someone within 3 ladder positions, above or below them. Players level on points share the same position.";

export const duplicateActiveChallengeMessage =
  "You already have an active challenge with this player. Finish it before starting another.";

export function splitActiveChallengeTargets<T extends { userId: string }>(targets: T[], activeOpponentIds: Iterable<string>) {
  const blockedOpponents = new Set(activeOpponentIds);

  return {
    availableTargets: targets.filter((target) => !blockedOpponents.has(target.userId)),
    blockedTargets: targets.filter((target) => blockedOpponents.has(target.userId))
  };
}
