import { ChallengeStatus } from "@prisma/client";
import { describe, expect, it } from "vitest";
import {
  activeChallengeBetweenWhere,
  activeChallengeStatuses,
  activeChallengesForPlayerWhere,
  canChallengePlayer,
  getActiveChallengeOpponentIds,
  splitActiveChallengeTargets
} from "@/lib/challenge-rules";

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

describe("activeChallengeStatuses", () => {
  it("treats pending and accepted challenges as an ongoing matchup", () => {
    expect(activeChallengeStatuses).toEqual([ChallengeStatus.Pending, ChallengeStatus.Accepted]);
    expect(activeChallengeStatuses).not.toContain(ChallengeStatus.Declined);
    expect(activeChallengeStatuses).not.toContain(ChallengeStatus.Completed);
    expect(activeChallengeStatuses).not.toContain(ChallengeStatus.Forfeit);
  });
});

describe("activeChallengeBetweenWhere", () => {
  it("matches an active challenge in either direction", () => {
    expect(activeChallengeBetweenWhere("season-1", "player-a", "player-b")).toEqual({
      seasonId: "season-1",
      status: { in: [ChallengeStatus.Pending, ChallengeStatus.Accepted] },
      OR: [
        { challengerId: "player-a", challengedId: "player-b" },
        { challengerId: "player-b", challengedId: "player-a" }
      ]
    });
  });
});

describe("activeChallengesForPlayerWhere", () => {
  it("matches active challenges the player opened or received", () => {
    expect(activeChallengesForPlayerWhere("season-1", "player-a")).toEqual({
      seasonId: "season-1",
      status: { in: [ChallengeStatus.Pending, ChallengeStatus.Accepted] },
      OR: [{ challengerId: "player-a" }, { challengedId: "player-a" }]
    });
  });
});

describe("getActiveChallengeOpponentIds", () => {
  it("collects opponents from challenges the player opened", () => {
    const opponents = getActiveChallengeOpponentIds(
      [{ challengerId: "me", challengedId: "player-b", status: ChallengeStatus.Pending }],
      "me"
    );

    expect(opponents).toEqual(["player-b"]);
  });

  it("collects opponents from challenges the player received", () => {
    const opponents = getActiveChallengeOpponentIds(
      [{ challengerId: "player-b", challengedId: "me", status: ChallengeStatus.Pending }],
      "me"
    );

    expect(opponents).toEqual(["player-b"]);
  });

  it("keeps blocking once the challenge has been accepted", () => {
    const opponents = getActiveChallengeOpponentIds(
      [{ challengerId: "player-b", challengedId: "me", status: ChallengeStatus.Accepted }],
      "me"
    );

    expect(opponents).toEqual(["player-b"]);
  });

  it("stops blocking once the challenge is no longer active", () => {
    const finished = [ChallengeStatus.Declined, ChallengeStatus.Completed, ChallengeStatus.Forfeit].map((status) => ({
      challengerId: "me",
      challengedId: "player-b",
      status
    }));

    expect(getActiveChallengeOpponentIds(finished, "me")).toEqual([]);
  });

  it("ignores challenges between other players", () => {
    const opponents = getActiveChallengeOpponentIds(
      [{ challengerId: "player-a", challengedId: "player-b", status: ChallengeStatus.Pending }],
      "me"
    );

    expect(opponents).toEqual([]);
  });

  it("lists an opponent once even with challenges in both directions", () => {
    const opponents = getActiveChallengeOpponentIds(
      [
        { challengerId: "me", challengedId: "player-b", status: ChallengeStatus.Pending },
        { challengerId: "player-b", challengedId: "me", status: ChallengeStatus.Accepted }
      ],
      "me"
    );

    expect(opponents).toEqual(["player-b"]);
  });
});

describe("splitActiveChallengeTargets", () => {
  it("only blocks opponents the player already has an active challenge with", () => {
    const result = splitActiveChallengeTargets(
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
