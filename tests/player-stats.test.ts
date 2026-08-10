import { describe, expect, it } from "vitest";
import {
  buildHeadToHead,
  filterSeasonMatches,
  formatWinRate,
  getOpponentId,
  selectRival,
  summarizeRecord,
  type StatMatch
} from "@/lib/player-stats";

const names = new Map([
  ["anders", "Anders"],
  ["peter", "Peter"],
  ["kalle", "Kalle"]
]);

function match(overrides: Partial<StatMatch> & Pick<StatMatch, "winnerId" | "loserId">): StatMatch {
  return {
    seasonId: "season-1",
    playedAt: new Date("2026-01-10T12:00:00Z"),
    createdAt: new Date("2026-01-10T12:00:00Z"),
    ...overrides
  };
}

describe("getOpponentId", () => {
  it("returns the other player in the match", () => {
    expect(getOpponentId(match({ winnerId: "me", loserId: "peter" }), "me")).toBe("peter");
    expect(getOpponentId(match({ winnerId: "peter", loserId: "me" }), "me")).toBe("peter");
  });

  it("ignores matches the player did not take part in", () => {
    expect(getOpponentId(match({ winnerId: "anders", loserId: "peter" }), "me")).toBeNull();
  });
});

describe("summarizeRecord", () => {
  it("aggregates wins, losses and win rate across all matches", () => {
    const record = summarizeRecord(
      [
        match({ winnerId: "me", loserId: "peter" }),
        match({ winnerId: "me", loserId: "anders" }),
        match({ winnerId: "kalle", loserId: "me" }),
        match({ winnerId: "anders", loserId: "peter" })
      ],
      "me"
    );

    expect(record).toEqual({ matchesPlayed: 3, wins: 2, losses: 1, winRate: 2 / 3 });
  });

  it("returns an empty record for a player without matches", () => {
    expect(summarizeRecord([], "me")).toEqual({ matchesPlayed: 0, wins: 0, losses: 0, winRate: 0 });
  });
});

describe("filterSeasonMatches", () => {
  it("keeps only matches from the requested season", () => {
    const matches = [
      match({ winnerId: "me", loserId: "peter", seasonId: "season-1" }),
      match({ winnerId: "me", loserId: "peter", seasonId: "season-2" }),
      match({ winnerId: "peter", loserId: "me", seasonId: "season-2" })
    ];

    expect(summarizeRecord(filterSeasonMatches(matches, "season-2"), "me")).toEqual({
      matchesPlayed: 2,
      wins: 1,
      losses: 1,
      winRate: 0.5
    });
    expect(summarizeRecord(filterSeasonMatches(matches, "season-1"), "me")).toMatchObject({ matchesPlayed: 1, wins: 1 });
  });

  it("keeps historical seasons correct when the player has since moved on", () => {
    const matches = [
      match({ winnerId: "me", loserId: "peter", seasonId: "season-old" }),
      match({ winnerId: "kalle", loserId: "me", seasonId: "season-new" })
    ];

    expect(summarizeRecord(filterSeasonMatches(matches, "season-old"), "me")).toMatchObject({
      matchesPlayed: 1,
      wins: 1,
      losses: 0
    });
  });
});

describe("buildHeadToHead", () => {
  it("reports every opponent from the profile player's perspective", () => {
    const headToHead = buildHeadToHead(
      [
        match({ winnerId: "me", loserId: "peter" }),
        match({ winnerId: "peter", loserId: "me" }),
        match({ winnerId: "peter", loserId: "me" }),
        match({ winnerId: "me", loserId: "anders" })
      ],
      "me",
      names
    );

    expect(headToHead).toHaveLength(2);
    expect(headToHead[0]).toMatchObject({
      opponentId: "peter",
      opponentName: "Peter",
      matchesPlayed: 3,
      wins: 1,
      losses: 2,
      winRate: 1 / 3
    });
    expect(headToHead[1]).toMatchObject({ opponentId: "anders", matchesPlayed: 1, wins: 1, losses: 0, winRate: 1 });
  });

  it("sorts by matches played and breaks ties on opponent name", () => {
    const headToHead = buildHeadToHead(
      [
        match({ winnerId: "me", loserId: "peter" }),
        match({ winnerId: "me", loserId: "kalle" }),
        match({ winnerId: "me", loserId: "anders" }),
        match({ winnerId: "me", loserId: "anders" })
      ],
      "me",
      names
    );

    expect(headToHead.map((record) => record.opponentName)).toEqual(["Anders", "Kalle", "Peter"]);
  });

  it("excludes matches between other players", () => {
    expect(buildHeadToHead([match({ winnerId: "anders", loserId: "peter" })], "me", names)).toEqual([]);
  });
});

describe("selectRival", () => {
  it("picks the most played opponent", () => {
    const rival = selectRival(
      buildHeadToHead(
        [
          match({ winnerId: "me", loserId: "peter" }),
          match({ winnerId: "peter", loserId: "me" }),
          match({ winnerId: "me", loserId: "anders" })
        ],
        "me",
        names
      )
    );

    expect(rival).toMatchObject({ opponentId: "peter", matchesPlayed: 2 });
  });

  it("breaks a tie on the most recently played opponent", () => {
    const rival = selectRival(
      buildHeadToHead(
        [
          match({ winnerId: "me", loserId: "anders", playedAt: new Date("2026-01-01T12:00:00Z") }),
          match({ winnerId: "me", loserId: "peter", playedAt: new Date("2026-03-01T12:00:00Z") })
        ],
        "me",
        names
      )
    );

    expect(rival).toMatchObject({ opponentId: "peter", matchesPlayed: 1 });
  });

  it("falls back to the opponent id when the last matches share a date", () => {
    const sameDay = new Date("2026-02-02T12:00:00Z");
    const rival = selectRival(
      buildHeadToHead(
        [
          match({ winnerId: "me", loserId: "peter", playedAt: sameDay, createdAt: sameDay }),
          match({ winnerId: "me", loserId: "anders", playedAt: sameDay, createdAt: sameDay })
        ],
        "me",
        names
      )
    );

    expect(rival).toMatchObject({ opponentId: "anders" });
  });

  it("has no rival when the player has no completed matches", () => {
    expect(selectRival(buildHeadToHead([], "me", names))).toBeNull();
  });
});

describe("formatWinRate", () => {
  it("renders a whole percentage", () => {
    expect(formatWinRate(0)).toBe("0%");
    expect(formatWinRate(2 / 3)).toBe("67%");
    expect(formatWinRate(1)).toBe("100%");
  });
});
