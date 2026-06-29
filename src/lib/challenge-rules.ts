export type ChallengeRulePlayer = {
  currentRank: number;
  points: number;
};

export function canChallengePlayer(challenger: ChallengeRulePlayer, challenged: ChallengeRulePlayer) {
  const rankDistance = Math.abs(challenger.currentRank - challenged.currentRank);

  if (rankDistance < 1 || rankDistance > 3) {
    return false;
  }

  if (challenger.points === challenged.points) {
    return true;
  }

  return challenger.currentRank > challenged.currentRank;
}

export const challengeWindowMessage =
  "A player may only challenge someone up to 3 ladder positions above them. Tied players may challenge each other within 3 ladder positions.";

