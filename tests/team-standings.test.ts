import { describe, expect, it } from "vitest";
import { calculateMatchScore } from "@/lib/scoring";
import {
  buildTeamStandings,
  type TeamStandingMatch,
  type TeamStandingPlayer,
  type TeamStandingTeam
} from "@/lib/team-standings";

const red: TeamStandingTeam = { id: "team-red", name: "Red" };
const blue: TeamStandingTeam = { id: "team-blue", name: "Blue" };

type PlayedMatch = {
  winnerId: string;
  loserId: string;
  loserSets: 0 | 1 | 2;
};

/**
 * Replays a season the same way results are registered and rebuilt: points
 * start at zero and every match stores the points before and after it.
 */
function playSeason(played: PlayedMatch[]) {
  const points = new Map<string, number>();
  const pointsOf = (userId: string) => points.get(userId) ?? 0;

  const matches = played.map((match) => {
    const winnerPointsBefore = pointsOf(match.winnerId);
    const loserPointsBefore = pointsOf(match.loserId);
    const score = calculateMatchScore({
      winnerPointsBefore,
      loserPointsBefore,
      winnerSets: 3,
      loserSets: match.loserSets
    });

    points.set(match.winnerId, score.winnerPointsAfter);
    points.set(match.loserId, score.loserPointsAfter);

    return {
      winnerId: match.winnerId,
      loserId: match.loserId,
      winnerPointsBefore,
      loserPointsBefore,
      winnerPointsAfter: score.winnerPointsAfter,
      loserPointsAfter: score.loserPointsAfter
    } satisfies TeamStandingMatch;
  });

  return { matches, pointsOf };
}

function seasonStandings(roster: Array<{ userId: string; team: TeamStandingTeam | null }>, played: PlayedMatch[]) {
  const { matches, pointsOf } = playSeason(played);
  const players: TeamStandingPlayer[] = roster.map((player) => ({
    userId: player.userId,
    points: pointsOf(player.userId),
    team: player.team
  }));

  return buildTeamStandings({ players, matches });
}

function standingOf(standings: ReturnType<typeof buildTeamStandings>, teamId: string) {
  return standings.find((team) => team.id === teamId);
}

describe("buildTeamStandings", () => {
  it("awards no team points for a match between two players on the same team", () => {
    const standings = seasonStandings(
      [
        { userId: "a", team: red },
        { userId: "b", team: red }
      ],
      [{ winnerId: "a", loserId: "b", loserSets: 2 }]
    );

    expect(standings).toEqual([
      {
        id: "team-red",
        name: "Red",
        points: 0,
        wins: 0,
        losses: 0,
        matchesPlayed: 0,
        players: 2,
        currentRank: 1
      }
    ]);
  });

  it("keeps awarding team points for matches between different teams", () => {
    const standings = seasonStandings(
      [
        { userId: "a", team: red },
        { userId: "c", team: blue }
      ],
      [{ winnerId: "a", loserId: "c", loserSets: 1 }]
    );

    expect(standingOf(standings, "team-red")).toMatchObject({ points: 4, wins: 1, losses: 0, matchesPlayed: 1 });
    expect(standingOf(standings, "team-blue")).toMatchObject({ points: 1, wins: 0, losses: 1, matchesPlayed: 1 });
  });

  it("strips only the internal games from a team that also plays other teams", () => {
    const standings = seasonStandings(
      [
        { userId: "a", team: red },
        { userId: "b", team: red },
        { userId: "c", team: blue }
      ],
      [
        { winnerId: "a", loserId: "c", loserSets: 1 },
        { winnerId: "b", loserId: "a", loserSets: 2 },
        { winnerId: "c", loserId: "b", loserSets: 0 }
      ]
    );

    // a and b hold 13 ladder points between them, 9 of which they took off each
    // other; Red only keeps the 4 a won against Blue.
    expect(standingOf(standings, "team-red")).toMatchObject({ points: 4, wins: 1, losses: 1, matchesPlayed: 2 });
    expect(standingOf(standings, "team-blue")).toMatchObject({ wins: 1, losses: 1, matchesPlayed: 2 });
  });

  it("removes the leapfrog points an internal upset would otherwise add", () => {
    const standings = seasonStandings(
      [
        { userId: "a", team: red },
        { userId: "b", team: red },
        { userId: "c", team: blue }
      ],
      [
        { winnerId: "a", loserId: "c", loserSets: 0 },
        // b starts far behind a and leapfrogs past them by winning the internal game.
        { winnerId: "b", loserId: "a", loserSets: 0 }
      ]
    );

    expect(standingOf(standings, "team-red")).toMatchObject({ points: 5, wins: 1, losses: 0, matchesPlayed: 1 });
  });

  it("keeps normal behaviour for matches involving an unteamed player", () => {
    const standings = seasonStandings(
      [
        { userId: "a", team: red },
        { userId: "solo", team: null },
        { userId: "other", team: null }
      ],
      [
        { winnerId: "a", loserId: "solo", loserSets: 2 },
        { winnerId: "solo", loserId: "other", loserSets: 0 }
      ]
    );

    expect(standings).toEqual([
      {
        id: "team-red",
        name: "Red",
        points: 3,
        wins: 1,
        losses: 0,
        matchesPlayed: 1,
        players: 1,
        currentRank: 1
      }
    ]);
  });

  it("treats a game between two unteamed players as an external match", () => {
    const standings = seasonStandings(
      [
        { userId: "solo", team: null },
        { userId: "other", team: null }
      ],
      [{ winnerId: "solo", loserId: "other", loserSets: 1 }]
    );

    expect(standings).toEqual([]);
  });

  it("recognises an internal game against a teammate who is not on the ladder", () => {
    const { matches, pointsOf } = playSeason([{ winnerId: "a", loserId: "benched", loserSets: 2 }]);

    const standings = buildTeamStandings({
      players: [{ userId: "a", points: pointsOf("a"), team: red }],
      matches,
      teamIdByUserId: new Map([
        ["a", red.id],
        ["benched", red.id]
      ])
    });

    expect(standings).toEqual([
      {
        id: "team-red",
        name: "Red",
        points: 0,
        wins: 0,
        losses: 0,
        matchesPlayed: 0,
        players: 1,
        currentRank: 1
      }
    ]);
  });

  it("ranks teams by points and falls back to the team name", () => {
    const standings = seasonStandings(
      [
        { userId: "a", team: red },
        { userId: "c", team: blue }
      ],
      [{ winnerId: "c", loserId: "a", loserSets: 2 }]
    );

    expect(standings.map((team) => [team.name, team.currentRank])).toEqual([
      ["Blue", 1],
      ["Red", 2]
    ]);
  });
});

describe("recalculated standings", () => {
  const roster = [
    { userId: "a", team: red },
    { userId: "b", team: red },
    { userId: "c", team: blue }
  ];

  it("excludes internal games when standings are rebuilt from the full history", () => {
    const history: PlayedMatch[] = [
      { winnerId: "a", loserId: "c", loserSets: 2 },
      { winnerId: "b", loserId: "a", loserSets: 1 },
      { winnerId: "b", loserId: "c", loserSets: 0 }
    ];

    const rebuilt = seasonStandings(roster, history);

    expect(standingOf(rebuilt, "team-red")).toMatchObject({ points: 8, wins: 2, losses: 0, matchesPlayed: 2 });
    expect(standingOf(rebuilt, "team-blue")).toMatchObject({ points: 2, wins: 0, losses: 2, matchesPlayed: 2 });
    // Standings are derived on every read, so replaying the same history again
    // can never double count or leave a stale total behind.
    expect(seasonStandings(roster, history)).toEqual(rebuilt);
  });

  it("does not leave stale totals when an internal result is edited", () => {
    const edited = seasonStandings(roster, [
      { winnerId: "a", loserId: "c", loserSets: 1 },
      { winnerId: "a", loserId: "b", loserSets: 0 }
    ]);
    const reversed = seasonStandings(roster, [
      { winnerId: "a", loserId: "c", loserSets: 1 },
      { winnerId: "b", loserId: "a", loserSets: 2 }
    ]);

    expect(edited).toEqual(reversed);
    expect(standingOf(edited, "team-red")).toMatchObject({ points: 4, wins: 1, losses: 0, matchesPlayed: 1 });
  });

  it("drops the team points again when a teammate switches onto the opponent's team", () => {
    const played: PlayedMatch[] = [{ winnerId: "a", loserId: "b", loserSets: 1 }];

    const asInternal = seasonStandings(
      [
        { userId: "a", team: red },
        { userId: "b", team: red }
      ],
      played
    );
    const asExternal = seasonStandings(
      [
        { userId: "a", team: red },
        { userId: "b", team: blue }
      ],
      played
    );

    expect(standingOf(asInternal, "team-red")).toMatchObject({ points: 0, matchesPlayed: 0 });
    expect(standingOf(asExternal, "team-red")).toMatchObject({ points: 4, wins: 1, matchesPlayed: 1 });
    expect(standingOf(asExternal, "team-blue")).toMatchObject({ points: 1, losses: 1, matchesPlayed: 1 });
  });
});
