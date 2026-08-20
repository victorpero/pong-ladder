import { ChallengeStatus, type Prisma } from "@prisma/client";

export type ChallengeRulePlayer = {
  currentRank: number;
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

export function canChallengePlayer(challenger: ChallengeRulePlayer, challenged: ChallengeRulePlayer) {
  const rankDistance = Math.abs(challenger.currentRank - challenged.currentRank);

  return rankDistance >= 1 && rankDistance <= 3;
}

export const challengeWindowMessage =
  "A player may only challenge someone within 3 ladder positions, above or below them.";

export const duplicateActiveChallengeMessage =
  "You already have an active challenge with this player. Finish it before starting another.";

export const staleChallengeResultMessage =
  "That challenge is no longer waiting for a result. Refresh the ladder to see its current state.";

export const unreportableChallengeMessage = "Only accepted challenges can be attached to match results.";

/**
 * Both messages mean the same thing to the player: the challenge moved on while
 * their page was open, so the result entry they are looking at is stale.
 */
export function isStaleChallengeResultMessage(message: string) {
  return message === staleChallengeResultMessage || message === unreportableChallengeMessage;
}

export function splitActiveChallengeTargets<T extends { userId: string }>(targets: T[], activeOpponentIds: Iterable<string>) {
  const blockedOpponents = new Set(activeOpponentIds);

  return {
    availableTargets: targets.filter((target) => !blockedOpponents.has(target.userId)),
    blockedTargets: targets.filter((target) => blockedOpponents.has(target.userId))
  };
}
