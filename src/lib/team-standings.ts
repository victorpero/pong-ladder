/**
 * Team standings are derived from registered match results, never stored, so a
 * rebuild always reflects the current match history.
 *
 * A player's season points are the sum of the points every one of their matches
 * awarded them, which is why an internal team game — both players on the same
 * team — would otherwise hand the team free points. Internal games still count
 * for the players themselves; they are stripped out here so they never move the
 * team's points, wins, losses or matches played. The players' own ladder points
 * are untouched, so a later match against another team is still scored against
 * whatever rank the internal game left them on.
 */

export type TeamStandingTeam = {
  id: string;
  name: string;
};

export type TeamStandingPlayer = {
  userId: string;
  points: number;
  team: TeamStandingTeam | null;
};

export type TeamStandingMatch = {
  winnerId: string;
  loserId: string;
  winnerPointsBefore: number;
  winnerPointsAfter: number;
  loserPointsBefore: number;
  loserPointsAfter: number;
};

export type TeamStandingsInput = {
  /** Season players counted towards their team, with their server-side team assignment. */
  players: TeamStandingPlayer[];
  /** Every registered match of the season. */
  matches: TeamStandingMatch[];
  /**
   * Team assignment for every organization member. Passing it lets internal
   * games played by members who are not on the current ladder be recognised as
   * internal; without it the ladder players are the only known assignments.
   */
  teamIdByUserId?: ReadonlyMap<string, string | null>;
};

export type TeamStanding = TeamStandingTeam & {
  points: number;
  wins: number;
  losses: number;
  matchesPlayed: number;
  players: number;
  currentRank: number;
};

type TeamTotals = Omit<TeamStanding, "currentRank">;

export function buildTeamStandings(input: TeamStandingsInput): TeamStanding[] {
  const teamIdByUserId =
    input.teamIdByUserId ?? new Map(input.players.map((player) => [player.userId, player.team?.id ?? null]));
  const countedPlayerIds = new Set(input.players.map((player) => player.userId));
  const teams = new Map<string, TeamTotals>();

  for (const player of input.players) {
    if (!player.team) {
      continue;
    }

    const totals = teams.get(player.team.id) ?? {
      id: player.team.id,
      name: player.team.name,
      points: 0,
      wins: 0,
      losses: 0,
      matchesPlayed: 0,
      players: 0
    };

    totals.points += player.points;
    totals.players += 1;
    teams.set(totals.id, totals);
  }

  for (const match of input.matches) {
    const winnerTeamId = teamIdByUserId.get(match.winnerId) ?? null;
    const loserTeamId = teamIdByUserId.get(match.loserId) ?? null;
    const isInternalGame = winnerTeamId !== null && winnerTeamId === loserTeamId;

    if (!isInternalGame) {
      const winnerTeam = winnerTeamId === null ? undefined : teams.get(winnerTeamId);
      const loserTeam = loserTeamId === null ? undefined : teams.get(loserTeamId);

      if (winnerTeam && countedPlayerIds.has(match.winnerId)) {
        winnerTeam.wins += 1;
        winnerTeam.matchesPlayed += 1;
      }

      if (loserTeam && countedPlayerIds.has(match.loserId)) {
        loserTeam.losses += 1;
        loserTeam.matchesPlayed += 1;
      }

      continue;
    }

    const team = teams.get(winnerTeamId);

    if (!team) {
      continue;
    }

    if (countedPlayerIds.has(match.winnerId)) {
      team.points -= match.winnerPointsAfter - match.winnerPointsBefore;
    }

    if (countedPlayerIds.has(match.loserId)) {
      team.points -= match.loserPointsAfter - match.loserPointsBefore;
    }
  }

  return Array.from(teams.values())
    .sort((left, right) => right.points - left.points || left.name.localeCompare(right.name))
    .map((team, index) => ({
      ...team,
      currentRank: index + 1
    }));
}
