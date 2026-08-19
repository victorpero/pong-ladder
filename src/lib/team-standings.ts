/**
 * Team standings are derived from registered match results, never stored, so a
 * rebuild always reflects the current match history.
 *
 * Every match carries the team each player belonged to when the result was
 * registered. Those snapshots decide which team earned a result, so a player
 * joining, leaving or switching a team later never reinterprets history: the
 * points stay with the team that fielded the player at the time.
 *
 * A match between two players on the same team is an internal game. It still
 * counts for the players themselves, but it awards its team nothing and counts
 * as neither a team win nor a team loss.
 */

import { type Prisma } from "@prisma/client";

/**
 * Matches that recorded a team as a participant. A team named by any snapshot is
 * part of the season's competitive history and can no longer be deleted.
 */
export function recordedTeamResultWhere(teamId: string): Prisma.MatchWhereInput {
  return {
    OR: [{ winnerTeamId: teamId }, { loserTeamId: teamId }]
  };
}

export type TeamStandingTeam = {
  id: string;
  name: string;
};

export type TeamStandingPlayer = {
  userId: string;
  teamId: string | null;
};

export type TeamStandingMatch = {
  winnerTeamId: string | null;
  loserTeamId: string | null;
  winnerPointsBefore: number;
  winnerPointsAfter: number;
  loserPointsBefore: number;
  loserPointsAfter: number;
};

export type TeamStandingsInput = {
  /** Teams of the organization, used for names and to ignore unknown snapshots. */
  teams: TeamStandingTeam[];
  /** Season players, counted as the team's current roster size. */
  players: TeamStandingPlayer[];
  /** Every registered match of the season. */
  matches: TeamStandingMatch[];
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

export function isInternalGame(match: Pick<TeamStandingMatch, "winnerTeamId" | "loserTeamId">) {
  return match.winnerTeamId !== null && match.winnerTeamId === match.loserTeamId;
}

export function buildTeamStandings(input: TeamStandingsInput): TeamStanding[] {
  const teams = new Map<string, TeamTotals>(
    input.teams.map((team) => [
      team.id,
      { id: team.id, name: team.name, points: 0, wins: 0, losses: 0, matchesPlayed: 0, players: 0 }
    ])
  );

  const teamOf = (teamId: string | null) => (teamId === null ? undefined : teams.get(teamId));

  for (const player of input.players) {
    const totals = teamOf(player.teamId);

    if (totals) {
      totals.players += 1;
    }
  }

  for (const match of input.matches) {
    if (isInternalGame(match)) {
      continue;
    }

    const winnerTeam = teamOf(match.winnerTeamId);
    const loserTeam = teamOf(match.loserTeamId);

    if (winnerTeam) {
      winnerTeam.points += match.winnerPointsAfter - match.winnerPointsBefore;
      winnerTeam.wins += 1;
      winnerTeam.matchesPlayed += 1;
    }

    if (loserTeam) {
      loserTeam.points += match.loserPointsAfter - match.loserPointsBefore;
      loserTeam.losses += 1;
      loserTeam.matchesPlayed += 1;
    }
  }

  return Array.from(teams.values())
    .filter((team) => team.players > 0 || team.matchesPlayed > 0)
    .sort((left, right) => right.points - left.points || left.name.localeCompare(right.name))
    .map((team, index) => ({
      ...team,
      currentRank: index + 1
    }));
}
