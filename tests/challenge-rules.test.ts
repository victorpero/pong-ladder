import { describe, expect, it } from "vitest";
import { canChallengePlayer, splitPendingChallengeTargets } from "@/lib/challenge-rules";

describe("canChallengePlayer", () => {
  it("allows challenging up to 3 positions above", () => {
    expect(canChallengePlayer({ currentRank: 8 }, { currentRank: 7 })).toBe(true);
    expect(canChallengePlayer({ currentRank: 8 }, { currentRank: 5 })).toBe(true);
  });

  it("allows challenging up to 3 positions below", () => {
    expect(canChallengePlayer({ currentRank: 5 }, { currentRank: 6 })).toBe(true);
    expect(canChallengePlayer({ currentRank: 5 }, { currentRank: 8 })).toBe(true);
  });

  it("rejects challenges more than 3 positions away in either direction", () => {
    expect(canChallengePlayer({ currentRank: 9 }, { currentRank: 5 })).toBe(false);
    expect(canChallengePlayer({ currentRank: 5 }, { currentRank: 9 })).toBe(false);
  });

  it("rejects a player challenging their own ladder position", () => {
    expect(canChallengePlayer({ currentRank: 4 }, { currentRank: 4 })).toBe(false);
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
