/**
 * Player statistics are derived from registered match results. A match row only
 * exists once a result has been registered, so pending, declined and cancelled
 * challenges never reach these calculations.
 */

export type StatMatch = {
  seasonId: string;
  winnerId: string;
  loserId: string;
  playedAt: Date;
  createdAt: Date;
};

export type PlayerRecord = {
  matchesPlayed: number;
  wins: number;
  losses: number;
  winRate: number;
};

export type HeadToHeadRecord = PlayerRecord & {
  opponentId: string;
  opponentName: string;
  lastPlayedAt: Date;
};

export const emptyRecord: PlayerRecord = {
  matchesPlayed: 0,
  wins: 0,
  losses: 0,
  winRate: 0
};

export function getOpponentId(match: StatMatch, playerId: string) {
  if (match.winnerId === playerId) {
    return match.loserId;
  }

  if (match.loserId === playerId) {
    return match.winnerId;
  }

  return null;
}

export function filterSeasonMatches<T extends StatMatch>(matches: T[], seasonId: string) {
  return matches.filter((match) => match.seasonId === seasonId);
}

export function summarizeRecord(matches: StatMatch[], playerId: string): PlayerRecord {
  let wins = 0;
  let losses = 0;

  for (const match of matches) {
    if (match.winnerId === playerId) {
      wins += 1;
    } else if (match.loserId === playerId) {
      losses += 1;
    }
  }

  return buildRecord(wins, losses);
}

/**
 * One pass over the player's matches, so the breakdown costs no extra queries.
 * Ordered by matches played descending, then opponent name, then opponent id so
 * the order is stable even for opponents sharing a display name.
 */
export function buildHeadToHead(
  matches: StatMatch[],
  playerId: string,
  opponentNames: Map<string, string>
): HeadToHeadRecord[] {
  const opponents = new Map<string, { wins: number; losses: number; lastPlayedAt: Date; lastCreatedAt: Date }>();

  for (const match of matches) {
    const opponentId = getOpponentId(match, playerId);

    if (!opponentId) {
      continue;
    }

    const current = opponents.get(opponentId) ?? {
      wins: 0,
      losses: 0,
      lastPlayedAt: match.playedAt,
      lastCreatedAt: match.createdAt
    };

    if (match.winnerId === playerId) {
      current.wins += 1;
    } else {
      current.losses += 1;
    }

    if (isMoreRecent(match, current)) {
      current.lastPlayedAt = match.playedAt;
      current.lastCreatedAt = match.createdAt;
    }

    opponents.set(opponentId, current);
  }

  return Array.from(opponents.entries())
    .map(([opponentId, totals]) => ({
      opponentId,
      opponentName: opponentNames.get(opponentId) ?? opponentId,
      lastPlayedAt: totals.lastPlayedAt,
      ...buildRecord(totals.wins, totals.losses)
    }))
    .sort(
      (left, right) =>
        right.matchesPlayed - left.matchesPlayed ||
        left.opponentName.localeCompare(right.opponentName) ||
        left.opponentId.localeCompare(right.opponentId)
    );
}

/**
 * The rival is the opponent the player has played the most completed matches
 * against. Ties go to the most recently played opponent, and an identical
 * played date falls back to the opponent id so the choice stays stable.
 */
export function selectRival(headToHead: HeadToHeadRecord[]): HeadToHeadRecord | null {
  let rival: HeadToHeadRecord | null = null;

  for (const record of headToHead) {
    if (!rival) {
      rival = record;
      continue;
    }

    if (record.matchesPlayed > rival.matchesPlayed) {
      rival = record;
      continue;
    }

    if (record.matchesPlayed < rival.matchesPlayed) {
      continue;
    }

    const recencyDifference = record.lastPlayedAt.getTime() - rival.lastPlayedAt.getTime();

    if (recencyDifference > 0 || (recencyDifference === 0 && record.opponentId.localeCompare(rival.opponentId) < 0)) {
      rival = record;
    }
  }

  return rival;
}

/**
 * Shared entry point for callers that only need the rival, so the ladder tag and
 * the profile statistics resolve it through the same rules. Opponent names only
 * label the result; they never influence which opponent is chosen.
 */
export function getRival(matches: StatMatch[], playerId: string, opponentNames: Map<string, string> = new Map()) {
  return selectRival(buildHeadToHead(matches, playerId, opponentNames));
}

export function formatWinRate(winRate: number) {
  return `${Math.round(winRate * 100)}%`;
}

function buildRecord(wins: number, losses: number): PlayerRecord {
  const matchesPlayed = wins + losses;

  return {
    matchesPlayed,
    wins,
    losses,
    winRate: matchesPlayed === 0 ? 0 : wins / matchesPlayed
  };
}

function isMoreRecent(match: StatMatch, current: { lastPlayedAt: Date; lastCreatedAt: Date }) {
  const playedDifference = match.playedAt.getTime() - current.lastPlayedAt.getTime();

  return playedDifference > 0 || (playedDifference === 0 && match.createdAt.getTime() > current.lastCreatedAt.getTime());
}
