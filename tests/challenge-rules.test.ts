import { describe, expect, it } from "vitest";
import { canChallengePlayer } from "@/lib/challenge-rules";

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

