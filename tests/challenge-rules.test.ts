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
import { withEffectivePositions } from "@/lib/ladder-positions";

describe("canChallengePlayer", () => {
  it("allows challenging up to 3 positions above", () => {
    expect(canChallengePlayer({ effectivePosition: 8 }, { effectivePosition: 7 })).toBe(true);
    expect(canChallengePlayer({ effectivePosition: 8 }, { effectivePosition: 5 })).toBe(true);
  });

  it("allows challenging up to 3 positions below", () => {
    expect(canChallengePlayer({ effectivePosition: 5 }, { effectivePosition: 6 })).toBe(true);
    expect(canChallengePlayer({ effectivePosition: 5 }, { effectivePosition: 8 })).toBe(true);
  });

  it("rejects challenges more than 3 positions away in either direction", () => {
    expect(canChallengePlayer({ effectivePosition: 9 }, { effectivePosition: 5 })).toBe(false);
    expect(canChallengePlayer({ effectivePosition: 5 }, { effectivePosition: 9 })).toBe(false);
  });

  it("allows players who share a position to challenge each other", () => {
    expect(canChallengePlayer({ effectivePosition: 4 }, { effectivePosition: 4 })).toBe(true);
  });

  it("gives every player on one position the same reach", () => {
    const ladder = withEffectivePositions([
      { userId: "a", points: 30 },
      { userId: "b", points: 20 },
      { userId: "c", points: 10 },
      { userId: "d", points: 0 },
      { userId: "e", points: 0 },
      { userId: "f", points: 0 }
    ]);
    const leader = ladder[0];
    const tiedPlayers = ladder.filter((entry) => entry.points === 0);

    expect(tiedPlayers).toHaveLength(3);
    for (const player of tiedPlayers) {
      expect(canChallengePlayer(player, leader)).toBe(true);
    }
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
        { userId: "player-a", effectivePosition: 1 },
        { userId: "player-b", effectivePosition: 2 },
        { userId: "player-c", effectivePosition: 3 }
      ],
      ["player-b"]
    );

    expect(result.availableTargets.map((target) => target.userId)).toEqual(["player-a", "player-c"]);
    expect(result.blockedTargets.map((target) => target.userId)).toEqual(["player-b"]);
  });
});
