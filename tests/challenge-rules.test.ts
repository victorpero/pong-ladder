import { describe, expect, it } from "vitest";
import { canChallengePlayer, splitPendingChallengeTargets } from "@/lib/challenge-rules";

describe("canChallengePlayer", () => {
  it("allows challenging up to 3 positions above", () => {
    expect(canChallengePlayer({ currentRank: 8, points: 10 }, { currentRank: 5, points: 20 })).toBe(true);
  });

  it("rejects challenges more than 3 positions away", () => {
    expect(canChallengePlayer({ currentRank: 9, points: 10 }, { currentRank: 5, points: 20 })).toBe(false);
  });

  it("rejects non-tied challenges down the ladder", () => {
    expect(canChallengePlayer({ currentRank: 5, points: 20 }, { currentRank: 8, points: 10 })).toBe(false);
  });

  it("allows tied players to challenge each other within 3 positions either way", () => {
    expect(canChallengePlayer({ currentRank: 8, points: 0 }, { currentRank: 9, points: 0 })).toBe(true);
    expect(canChallengePlayer({ currentRank: 9, points: 0 }, { currentRank: 8, points: 0 })).toBe(true);
  });
});

describe("splitPendingChallengeTargets", () => {
  it("only blocks targets already challenged by the same player while pending", () => {
    const result = splitPendingChallengeTargets(
      [
        { userId: "player-a", currentRank: 1 },
        { userId: "player-b", currentRank: 2 },
        { userId: "player-c", currentRank: 3 }
      ],
      ["player-b"]
    );

    expect(result.availableTargets.map((target) => target.userId)).toEqual(["player-a", "player-c"]);
    expect(result.blockedTargets.map((target) => target.userId)).toEqual(["player-b"]);
  });
});
