export type LadderStanding = { points: number };

export type PositionedStanding<T> = T & { effectivePosition: number };

/** Ladder positions a player may reach with a challenge, in either direction. */
export const maxChallengeDistance = 3;

/**
 * Competition ranking: a position is the number of players with strictly more
 * points, plus one. Everyone level on points shares a single position, so the
 * display tie-break (rank, join date) never decides who may challenge whom.
 */
function buildPositionByPoints(standings: readonly LadderStanding[]) {
  const playersPerPoints = new Map<number, number>();

  for (const standing of standings) {
    playersPerPoints.set(standing.points, (playersPerPoints.get(standing.points) ?? 0) + 1);
  }

  const positionByPoints = new Map<number, number>();
  let playersAhead = 0;

  for (const points of Array.from(playersPerPoints.keys()).sort((left, right) => right - left)) {
    positionByPoints.set(points, playersAhead + 1);
    playersAhead += playersPerPoints.get(points) ?? 0;
  }

  return positionByPoints;
}

/**
 * Attaches the effective position to every standing. The input order is kept so
 * callers stay free to sort rows however they present them.
 */
export function withEffectivePositions<T extends LadderStanding>(standings: readonly T[]): Array<PositionedStanding<T>> {
  const positionByPoints = buildPositionByPoints(standings);

  return standings.map((standing) => ({
    ...standing,
    effectivePosition: positionByPoints.get(standing.points) ?? 1
  }));
}
