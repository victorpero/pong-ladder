import { describe, expect, it } from "vitest";
import { calculateMatchScore } from "@/lib/scoring";
import {
  buildTeamStandings,
  isInternalGame,
  type TeamStanding,
  type TeamStandingMatch,
  type TeamStandingTeam
} from "@/lib/team-standings";

const red: TeamStandingTeam = { id: "team-red", name: "Red" };
const blue: TeamStandingTeam = { id: "team-blue", name: "Blue" };
const teams = [red, blue];

/**
 * Replays a season the way results are registered and rebuilt: points start at
 * zero, every match stores the points before and after it, and every match keeps
 * the team each player belonged to at that moment.
 */
function season(roster: Array<[userId: string, team: TeamStandingTeam | null]>) {
  const points = new Map<string, number>();
  const teamIds = new Map(roster.map(([userId, team]) => [userId, team?.id ?? null]));
  const seasonPlayers = new Set(roster.map(([userId]) => userId));
  const matches: TeamStandingMatch[] = [];

  const pointsOf = (userId: string) => points.get(userId) ?? 0;

  return {
    matches,
    joinTeam(userId: string, team: TeamStandingTeam | null) {
      teamIds.set(userId, team?.id ?? null);
    },
    leaveSeason(userId: string) {
      seasonPlayers.delete(userId);
    },
    play(winnerId: string, loserId: string, loserSets: 0 | 1 | 2) {
      const winnerPointsBefore = pointsOf(winnerId);
      const loserPointsBefore = pointsOf(loserId);
      const score = calculateMatchScore({ winnerPointsBefore, loserPointsBefore, winnerSets: 3, loserSets });

      points.set(winnerId, score.winnerPointsAfter);
      points.set(loserId, score.loserPointsAfter);

      matches.push({
        winnerTeamId: teamIds.get(winnerId) ?? null,
        loserTeamId: teamIds.get(loserId) ?? null,
        winnerPointsBefore,
        loserPointsBefore,
        winnerPointsAfter: score.winnerPointsAfter,
        loserPointsAfter: score.loserPointsAfter
      });
    },
    standings() {
      return buildTeamStandings({
        teams,
        players: [...seasonPlayers].map((userId) => ({ userId, teamId: teamIds.get(userId) ?? null })),
        matches
      });
    }
  };
}

function standingOf(standings: TeamStanding[], team: TeamStandingTeam) {
  return standings.find((standing) => standing.id === team.id);
}

describe("isInternalGame", () => {
  it("only treats two players of the same team as an internal game", () => {
    expect(isInternalGame({ winnerTeamId: "team-red", loserTeamId: "team-red" })).toBe(true);
    expect(isInternalGame({ winnerTeamId: "team-red", loserTeamId: "team-blue" })).toBe(false);
    expect(isInternalGame({ winnerTeamId: "team-red", loserTeamId: null })).toBe(false);
    expect(isInternalGame({ winnerTeamId: null, loserTeamId: null })).toBe(false);
  });
});

describe("buildTeamStandings", () => {
  it("awards no team points for a match between two players on the same team", () => {
    const play = season([
      ["a", red],
      ["b", red]
    ]);
    play.play("a", "b", 2);

    expect(play.standings()).toEqual([
      { id: "team-red", name: "Red", points: 0, wins: 0, losses: 0, matchesPlayed: 0, players: 2, currentRank: 1 }
    ]);
  });

  it("keeps awarding team points for matches between different teams", () => {
    const play = season([
      ["a", red],
      ["c", blue]
    ]);
    play.play("a", "c", 1);

    const standings = play.standings();

    expect(standingOf(standings, red)).toMatchObject({ points: 4, wins: 1, losses: 0, matchesPlayed: 1 });
    expect(standingOf(standings, blue)).toMatchObject({ points: 1, wins: 0, losses: 1, matchesPlayed: 1 });
  });

  it("strips only the internal games from a team that also plays other teams", () => {
    const play = season([
      ["a", red],
      ["b", red],
      ["c", blue]
    ]);
    play.play("a", "c", 1);
    play.play("b", "a", 2);
    play.play("c", "b", 0);

    const standings = play.standings();

    // a and b hold 13 ladder points between them, 9 of which they took off each
    // other; Red only keeps the 4 a won against Blue.
    expect(standingOf(standings, red)).toMatchObject({ points: 4, wins: 1, losses: 1, matchesPlayed: 2 });
    expect(standingOf(standings, blue)).toMatchObject({ wins: 1, losses: 1, matchesPlayed: 2 });
  });

  it("removes the leapfrog points an internal upset would otherwise add", () => {
    const play = season([
      ["a", red],
      ["b", red],
      ["c", blue]
    ]);
    play.play("a", "c", 0);
    // b starts far behind a and leapfrogs past them by winning the internal game.
    play.play("b", "a", 0);

    expect(standingOf(play.standings(), red)).toMatchObject({ points: 5, wins: 1, losses: 0, matchesPlayed: 1 });
  });

  it("keeps normal behaviour for matches involving an unteamed player", () => {
    const play = season([
      ["a", red],
      ["solo", null],
      ["other", null]
    ]);
    play.play("a", "solo", 2);
    play.play("solo", "other", 0);

    expect(play.standings()).toEqual([
      { id: "team-red", name: "Red", points: 3, wins: 1, losses: 0, matchesPlayed: 1, players: 1, currentRank: 1 }
    ]);
  });

  it("leaves teams out of the standings when they have no players and no matches", () => {
    const play = season([
      ["solo", null],
      ["other", null]
    ]);
    play.play("solo", "other", 1);

    expect(play.standings()).toEqual([]);
  });

  it("still recognises an internal game against a teammate who left the season", () => {
    const play = season([
      ["a", red],
      ["benched", red]
    ]);
    play.play("a", "benched", 2);
    play.leaveSeason("benched");

    expect(play.standings()).toEqual([
      { id: "team-red", name: "Red", points: 0, wins: 0, losses: 0, matchesPlayed: 0, players: 1, currentRank: 1 }
    ]);
  });

  it("ranks teams by points and falls back to the team name", () => {
    const play = season([
      ["a", red],
      ["c", blue]
    ]);
    play.play("c", "a", 2);

    expect(play.standings().map((team) => [team.name, team.currentRank])).toEqual([
      ["Blue", 1],
      ["Red", 2]
    ]);
  });
});

describe("team changes after a match", () => {
  it("keeps an internal game worthless after a teammate joins another team", () => {
    const play = season([
      ["a", red],
      ["b", red]
    ]);
    play.play("a", "b", 1);
    play.joinTeam("b", blue);

    const standings = play.standings();

    expect(standingOf(standings, red)).toMatchObject({ points: 0, wins: 0, losses: 0, matchesPlayed: 0, players: 1 });
    expect(standingOf(standings, blue)).toMatchObject({ points: 0, wins: 0, losses: 0, matchesPlayed: 0, players: 1 });
  });

  it("keeps an internal game worthless after a teammate leaves their team", () => {
    const play = season([
      ["a", red],
      ["b", red]
    ]);
    play.play("a", "b", 0);
    play.joinTeam("b", null);

    expect(standingOf(play.standings(), red)).toMatchObject({ points: 0, wins: 0, losses: 0, matchesPlayed: 0 });
  });

  it("keeps an inter-team result with the teams that played it", () => {
    const play = season([
      ["a", red],
      ["c", blue]
    ]);
    play.play("a", "c", 1);
    play.joinTeam("c", red);

    const standings = play.standings();

    expect(standingOf(standings, red)).toMatchObject({ points: 4, wins: 1, losses: 0, matchesPlayed: 1, players: 2 });
    expect(standingOf(standings, blue)).toMatchObject({ points: 1, wins: 0, losses: 1, matchesPlayed: 1, players: 0 });
  });

  it("scores a rematch by the teams of the day", () => {
    const play = season([
      ["a", red],
      ["b", red]
    ]);
    play.play("a", "b", 1);
    play.joinTeam("b", blue);
    play.play("a", "b", 0);

    const standings = play.standings();

    // Only the second meeting is an inter-team match: a moved from 4 to 9 points.
    expect(standingOf(standings, red)).toMatchObject({ points: 5, wins: 1, losses: 0, matchesPlayed: 1 });
    expect(standingOf(standings, blue)).toMatchObject({ points: 0, wins: 0, losses: 1, matchesPlayed: 1 });
  });
});

describe("recalculated standings", () => {
  const roster: Array<[string, TeamStandingTeam | null]> = [
    ["a", red],
    ["b", red],
    ["c", blue]
  ];

  it("excludes internal games when standings are rebuilt from the full history", () => {
    const play = season(roster);
    play.play("a", "c", 2);
    play.play("b", "a", 1);
    play.play("b", "c", 0);

    const rebuilt = play.standings();

    expect(standingOf(rebuilt, red)).toMatchObject({ points: 8, wins: 2, losses: 0, matchesPlayed: 2 });
    expect(standingOf(rebuilt, blue)).toMatchObject({ points: 2, wins: 0, losses: 2, matchesPlayed: 2 });
    // Standings are derived on every read, so replaying the same history again
    // can never double count or leave a stale total behind.
    expect(play.standings()).toEqual(rebuilt);
  });

  it("does not leave stale totals when an internal result is edited", () => {
    const played = season(roster);
    played.play("a", "c", 1);
    played.play("a", "b", 0);

    const reversed = season(roster);
    reversed.play("a", "c", 1);
    reversed.play("b", "a", 2);

    expect(played.standings()).toEqual(reversed.standings());
    expect(standingOf(played.standings(), red)).toMatchObject({ points: 4, wins: 1, losses: 0, matchesPlayed: 1 });
  });

  it("drops a removed result from the team totals", () => {
    const play = season(roster);
    play.play("a", "c", 2);
    play.play("b", "c", 0);

    const withBoth = play.standings();
    play.matches.pop();

    expect(standingOf(withBoth, red)).toMatchObject({ points: 10, wins: 2, matchesPlayed: 2 });
    expect(standingOf(play.standings(), red)).toMatchObject({ points: 3, wins: 1, matchesPlayed: 1 });
  });
});
