import { ChallengeStatus } from "@prisma/client";
import { describe, expect, it } from "vitest";
import { openChallengeStatuses, openPlayerChallengeWhere, playerChallengeWhere, playerMatchWhere } from "@/lib/admin-cleanup";

describe("admin cleanup filters", () => {
  it("matches player references in matches", () => {
    expect(playerMatchWhere("player-1")).toEqual({
      OR: [{ winnerId: "player-1" }, { loserId: "player-1" }]
    });
  });

  it("matches player references in challenges", () => {
    expect(playerChallengeWhere("player-1")).toEqual({
      OR: [{ challengerId: "player-1" }, { challengedId: "player-1" }]
    });
  });

  it("limits bulk challenge cancellation to open unlinked challenges", () => {
    expect(openChallengeStatuses).toEqual([ChallengeStatus.Pending, ChallengeStatus.Accepted]);
    expect(openPlayerChallengeWhere("player-1")).toEqual({
      OR: [{ challengerId: "player-1" }, { challengedId: "player-1" }],
      status: { in: [ChallengeStatus.Pending, ChallengeStatus.Accepted] },
      match: null
    });
  });
});
