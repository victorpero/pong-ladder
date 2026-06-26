import { describe, expect, it } from "vitest";
import { calculateMatchScore, validateBestOfFiveResult } from "@/lib/scoring";

describe("calculateMatchScore", () => {
  it("scores a higher-ranked player winning 3-0", () => {
    expect(calculateMatchScore({ winnerPointsBefore: 41, loserPointsBefore: 28, winnerSets: 3, loserSets: 0 })).toMatchObject({
      winnerPointsAfter: 46,
      loserPointsAfter: 28
    });
  });

  it("scores a higher-ranked player winning 3-1", () => {
    expect(calculateMatchScore({ winnerPointsBefore: 41, loserPointsBefore: 28, winnerSets: 3, loserSets: 1 })).toMatchObject({
      winnerPointsAfter: 45,
      loserPointsAfter: 29
    });
  });

  it("scores a higher-ranked player winning 3-2", () => {
    expect(calculateMatchScore({ winnerPointsBefore: 41, loserPointsBefore: 28, winnerSets: 3, loserSets: 2 })).toMatchObject({
      winnerPointsAfter: 44,
      loserPointsAfter: 30
    });
  });

  it("scores a lower-ranked player winning 3-0", () => {
    expect(calculateMatchScore({ winnerPointsBefore: 22, loserPointsBefore: 32, winnerSets: 3, loserSets: 0 })).toMatchObject({
      winnerPointsAfter: 37,
      loserPointsAfter: 32
    });
  });

  it("scores a lower-ranked player winning 3-1", () => {
    expect(calculateMatchScore({ winnerPointsBefore: 22, loserPointsBefore: 32, winnerSets: 3, loserSets: 1 })).toMatchObject({
      winnerPointsAfter: 36,
      loserPointsAfter: 33
    });
  });

  it("scores a lower-ranked player winning 3-2", () => {
    expect(calculateMatchScore({ winnerPointsBefore: 22, loserPointsBefore: 32, winnerSets: 3, loserSets: 2 })).toMatchObject({
      winnerPointsAfter: 35,
      loserPointsAfter: 34
    });
  });

  it("rejects invalid best-of-five results", () => {
    expect(() => validateBestOfFiveResult(2, 3)).toThrow("best-of-five");
    expect(() => validateBestOfFiveResult(3, 3)).toThrow("best-of-five");
  });
});

