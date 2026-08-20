import { ChallengeStatus } from "@prisma/client";
import { describe, expect, it } from "vitest";
import {
  getLadderChallengeState,
  getLadderChallengeStates,
  hasLadderChallengeControl,
  type LadderChallengeRelationship
} from "@/lib/ladder-challenge-state";

const me = { userId: "me", effectivePosition: 4 };
const rival = { userId: "rival", effectivePosition: 3 };
const distant = { userId: "distant", effectivePosition: 9 };
const other = { userId: "other", effectivePosition: 5 };
// Level on points with the viewer, so both share position 4.
const tied = { userId: "tied", effectivePosition: 4 };

function challenge(
  challengerId: string,
  challengedId: string,
  status: ChallengeStatus,
  id = "challenge-1"
): LadderChallengeRelationship {
  return { id, challengerId, challengedId, status };
}

function stateFor(row: typeof rival, challenges: LadderChallengeRelationship[] = [], viewer: typeof me | null = me) {
  return getLadderChallengeState({ viewer, row, challenges });
}

describe("getLadderChallengeState", () => {
  it("offers a challenge against an eligible opponent", () => {
    expect(stateFor(rival)).toEqual({ kind: "available" });
  });

  it("offers nothing against a player outside the ladder window", () => {
    expect(stateFor(distant)).toEqual({ kind: "ineligible" });
  });

  it("never offers a self-challenge", () => {
    expect(stateFor(me)).toEqual({ kind: "self" });
  });

  it("offers a challenge to a player sharing the viewer's position", () => {
    expect(stateFor(tied)).toEqual({ kind: "available" });
  });

  it("measures the window from the shared position, not the stored row order", () => {
    // Four players level on points all sit at position 1, so the player three
    // positions below them stays reachable however the rows happen to be sorted.
    const leader = { userId: "leader", effectivePosition: 1 };
    const reachable = { userId: "reachable", effectivePosition: 4 };
    const beyond = { userId: "beyond", effectivePosition: 5 };

    expect(getLadderChallengeState({ viewer: leader, row: reachable, challenges: [] })).toEqual({ kind: "available" });
    expect(getLadderChallengeState({ viewer: leader, row: beyond, challenges: [] })).toEqual({ kind: "ineligible" });
  });

  it("still tracks a live challenge between players sharing a position", () => {
    expect(stateFor(tied, [challenge("tied", "me", ChallengeStatus.Pending)])).toEqual({
      kind: "incoming",
      challengeId: "challenge-1"
    });
  });

  it("offers nothing when nobody is signed in", () => {
    expect(stateFor(rival, [], null)).toEqual({ kind: "unavailable" });
  });

  it("shows an outgoing challenge as pending", () => {
    const challenges = [challenge("me", "rival", ChallengeStatus.Pending)];

    expect(stateFor(rival, challenges)).toEqual({ kind: "outgoing", challengeId: "challenge-1" });
  });

  it("distinguishes an incoming challenge from an outgoing one", () => {
    const challenges = [challenge("rival", "me", ChallengeStatus.Pending)];

    expect(stateFor(rival, challenges)).toEqual({ kind: "incoming", challengeId: "challenge-1" });
  });

  it("shows an accepted challenge as active in either direction", () => {
    expect(stateFor(rival, [challenge("me", "rival", ChallengeStatus.Accepted)])).toEqual({
      kind: "active",
      challengeId: "challenge-1"
    });
    expect(stateFor(rival, [challenge("rival", "me", ChallengeStatus.Accepted)])).toEqual({
      kind: "active",
      challengeId: "challenge-1"
    });
  });

  it("returns to the normal eligibility state once a challenge is no longer active", () => {
    for (const status of [ChallengeStatus.Completed, ChallengeStatus.Declined, ChallengeStatus.Forfeit]) {
      expect(stateFor(rival, [challenge("me", "rival", status)])).toEqual({ kind: "available" });
      expect(stateFor(rival, [challenge("rival", "me", status)])).toEqual({ kind: "available" });
    }
  });

  it("keeps an ineligible row ineligible after a finished challenge", () => {
    expect(stateFor(distant, [challenge("me", "distant", ChallengeStatus.Completed)])).toEqual({ kind: "ineligible" });
  });

  it("prefers the live challenge over a finished one with the same opponent", () => {
    const challenges = [
      challenge("me", "rival", ChallengeStatus.Completed, "old"),
      challenge("rival", "me", ChallengeStatus.Pending, "current")
    ];

    expect(stateFor(rival, challenges)).toEqual({ kind: "incoming", challengeId: "current" });
  });

  it("does not let a challenge with one opponent affect another row", () => {
    const challenges = [challenge("me", "rival", ChallengeStatus.Pending)];

    expect(stateFor(other, challenges)).toEqual({ kind: "available" });
  });
});

describe("getLadderChallengeStates", () => {
  const ladder = [rival, me, tied, other, distant];

  it("derives one state per row for the signed-in player", () => {
    const states = getLadderChallengeStates({
      viewerId: "me",
      ladder,
      challenges: [challenge("rival", "me", ChallengeStatus.Pending)]
    });

    expect(states.get("rival")).toEqual({ kind: "incoming", challengeId: "challenge-1" });
    expect(states.get("me")).toEqual({ kind: "self" });
    expect(states.get("tied")).toEqual({ kind: "available" });
    expect(states.get("other")).toEqual({ kind: "available" });
    expect(states.get("distant")).toEqual({ kind: "ineligible" });
  });

  it("offers the same control to every player sharing a position", () => {
    // Two rows level on points must not differ just because one is stored above
    // the other, which is the tied-position guarantee the ladder inherits.
    const tiedLadder = [
      { userId: "me", effectivePosition: 1 },
      { userId: "first", effectivePosition: 2 },
      { userId: "second", effectivePosition: 2 }
    ];
    const states = getLadderChallengeStates({ viewerId: "me", ladder: tiedLadder, challenges: [] });

    expect(states.get("first")).toEqual(states.get("second"));
    expect(states.get("first")).toEqual({ kind: "available" });
  });

  it("offers nothing when the viewer has not joined the season", () => {
    const states = getLadderChallengeStates({ viewerId: "visitor", ladder, challenges: [] });

    expect([...states.values()].every((state) => state.kind === "unavailable")).toBe(true);
  });

  it("offers nothing to a signed-out visitor", () => {
    const states = getLadderChallengeStates({ viewerId: null, ladder, challenges: [] });

    expect([...states.values()].every((state) => state.kind === "unavailable")).toBe(true);
  });
});

describe("hasLadderChallengeControl", () => {
  it("reserves row space only for states that render something", () => {
    expect(hasLadderChallengeControl({ kind: "available" })).toBe(true);
    expect(hasLadderChallengeControl({ kind: "outgoing", challengeId: "challenge-1" })).toBe(true);
    expect(hasLadderChallengeControl({ kind: "incoming", challengeId: "challenge-1" })).toBe(true);
    expect(hasLadderChallengeControl({ kind: "active", challengeId: "challenge-1" })).toBe(true);
    expect(hasLadderChallengeControl({ kind: "ineligible" })).toBe(false);
    expect(hasLadderChallengeControl({ kind: "self" })).toBe(false);
    expect(hasLadderChallengeControl({ kind: "unavailable" })).toBe(false);
  });
});
