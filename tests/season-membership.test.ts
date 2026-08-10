import { describe, expect, it } from "vitest";
import { nextLadderPosition, selectSeasonJoinCandidates } from "@/lib/season-membership";

describe("nextLadderPosition", () => {
  it("starts an empty season at the first position", () => {
    expect(nextLadderPosition(null)).toBe(1);
  });

  it("appends below the lowest occupied position", () => {
    expect(nextLadderPosition(8)).toBe(9);
  });

  it("stays clear of taken positions when ranks have gaps", () => {
    expect(nextLadderPosition(12)).toBe(13);
  });
});

describe("selectSeasonJoinCandidates", () => {
  it("only offers players who are not in the season", () => {
    const candidates = selectSeasonJoinCandidates(
      [{ id: "player-a" }, { id: "player-b" }, { id: "player-c" }],
      ["player-b"]
    );

    expect(candidates.map((candidate) => candidate.id)).toEqual(["player-a", "player-c"]);
  });

  it("offers nobody when every player already joined", () => {
    expect(selectSeasonJoinCandidates([{ id: "player-a" }], ["player-a"])).toEqual([]);
  });

  it("offers everyone for a season without players", () => {
    expect(selectSeasonJoinCandidates([{ id: "player-a" }, { id: "player-b" }], []).map((c) => c.id)).toEqual([
      "player-a",
      "player-b"
    ]);
  });
});
