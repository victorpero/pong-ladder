import { describe, expect, it } from "vitest";
import { maxChallengeDistance, withEffectivePositions } from "@/lib/ladder-positions";

function positionsFor(points: number[]) {
  return withEffectivePositions(points.map((value) => ({ points: value }))).map((entry) => entry.effectivePosition);
}

describe("withEffectivePositions", () => {
  it("numbers a ladder without ties by its standings order", () => {
    expect(positionsFor([40, 30, 20, 10])).toEqual([1, 2, 3, 4]);
  });

  it("gives tied players at the top the same position and skips the ones they share", () => {
    expect(positionsFor([40, 40, 30, 20])).toEqual([1, 1, 3, 4]);
  });

  it("gives tied players in the middle the same position", () => {
    expect(positionsFor([40, 30, 30, 30, 10])).toEqual([1, 2, 2, 2, 5]);
  });

  it("gives tied players at the bottom the same position", () => {
    expect(positionsFor([40, 30, 20, 0, 0, 0])).toEqual([1, 2, 3, 4, 4, 4]);
  });

  it("gives every player the same position when the whole ladder is level", () => {
    expect(positionsFor([0, 0, 0, 0])).toEqual([1, 1, 1, 1]);
  });

  it("does not depend on the order the standings arrive in", () => {
    const byPoints = withEffectivePositions([
      { userId: "a", points: 30 },
      { userId: "b", points: 0 },
      { userId: "c", points: 0 }
    ]);
    const reordered = withEffectivePositions([
      { userId: "c", points: 0 },
      { userId: "a", points: 30 },
      { userId: "b", points: 0 }
    ]);

    const positionById = (entries: typeof byPoints) =>
      new Map(entries.map((entry) => [entry.userId, entry.effectivePosition]));

    expect(positionById(reordered)).toEqual(positionById(byPoints));
  });

  it("keeps the rest of each standing untouched", () => {
    expect(withEffectivePositions([{ userId: "a", points: 12, currentRank: 7 }])).toEqual([
      { userId: "a", points: 12, currentRank: 7, effectivePosition: 1 }
    ]);
  });

  it("handles an empty ladder", () => {
    expect(withEffectivePositions([])).toEqual([]);
  });
});

describe("maxChallengeDistance", () => {
  it("keeps the ladder window at 3 positions", () => {
    expect(maxChallengeDistance).toBe(3);
  });
});
