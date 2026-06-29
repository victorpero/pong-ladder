export type MatchSets = {
  winnerSets: 3;
  loserSets: 0 | 1 | 2;
};

export type ScoreInput = MatchSets & {
  winnerPointsBefore: number;
  loserPointsBefore: number;
};

export type ScoreResult = {
  winnerPointsAfter: number;
  loserPointsAfter: number;
  winnerMatchPoints: number;
  loserMatchPoints: number;
  winnerWasLowerRanked: boolean;
};

export function validateBestOfFiveResult(winnerSets: number, loserSets: number): asserts winnerSets is 3 {
  if (winnerSets !== 3 || ![0, 1, 2].includes(loserSets)) {
    throw new Error("Match results must be best-of-five scores: 3-0, 3-1, or 3-2.");
  }
}

export function calculateMatchScore(input: ScoreInput): ScoreResult {
  validateBestOfFiveResult(input.winnerSets, input.loserSets);

  const winnerMatchPoints = 5 - input.loserSets;
  const loserMatchPoints = input.loserSets;
  const winnerWasLowerRanked = input.winnerPointsBefore < input.loserPointsBefore;

  if (winnerWasLowerRanked) {
    return {
      winnerPointsAfter: input.loserPointsBefore + winnerMatchPoints,
      loserPointsAfter: input.loserPointsBefore + loserMatchPoints,
      winnerMatchPoints,
      loserMatchPoints,
      winnerWasLowerRanked
    };
  }

  return {
    winnerPointsAfter: input.winnerPointsBefore + winnerMatchPoints,
    loserPointsAfter: input.loserPointsBefore + loserMatchPoints,
    winnerMatchPoints,
    loserMatchPoints,
    winnerWasLowerRanked
  };
}

