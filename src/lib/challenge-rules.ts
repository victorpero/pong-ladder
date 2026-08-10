export type ChallengeRulePlayer = {
  currentRank: number;
};

export function canChallengePlayer(challenger: ChallengeRulePlayer, challenged: ChallengeRulePlayer) {
  const rankDistance = Math.abs(challenger.currentRank - challenged.currentRank);

  return rankDistance >= 1 && rankDistance <= 3;
}

export const challengeWindowMessage =
  "A player may only challenge someone within 3 ladder positions, above or below them.";

export const duplicatePendingChallengeMessage = "You already have a pending challenge against this player.";

export function splitPendingChallengeTargets<T extends { userId: string }>(targets: T[], pendingChallengedIds: Iterable<string>) {
  const pendingChallengeTargets = new Set(pendingChallengedIds);

  return {
    availableTargets: targets.filter((target) => !pendingChallengeTargets.has(target.userId)),
    blockedTargets: targets.filter((target) => pendingChallengeTargets.has(target.userId))
  };
}
