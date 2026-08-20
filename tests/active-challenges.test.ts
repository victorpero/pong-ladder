import { ChallengeStatus } from "@prisma/client";
import { describe, expect, it } from "vitest";
import {
  getChallengeOpponentId,
  isReportableChallenge,
  reportableChallengeStatus,
  resolveMatchParticipants,
  selectReportableChallenges
} from "@/lib/active-challenges";

function challenge(status: ChallengeStatus | string, challengerId = "me", challengedId = "rival") {
  return { id: `${challengerId}-${challengedId}-${status}`, status, challengerId, challengedId };
}

describe("reportable challenge selection", () => {
  it("mirrors the accepted status of the challenge model", () => {
    // The ladder cards compare against a literal so the browser bundle stays free of the Prisma client.
    expect(reportableChallengeStatus).toBe(ChallengeStatus.Accepted);
  });

  it("treats an accepted challenge the viewer takes part in as reportable", () => {
    expect(isReportableChallenge(challenge(ChallengeStatus.Accepted, "me", "rival"), "me")).toBe(true);
    expect(isReportableChallenge(challenge(ChallengeStatus.Accepted, "rival", "me"), "me")).toBe(true);
  });

  it("does not treat a pending challenge as reportable", () => {
    expect(isReportableChallenge(challenge(ChallengeStatus.Pending), "me")).toBe(false);
  });

  it("does not treat a closed challenge as reportable", () => {
    for (const status of [ChallengeStatus.Completed, ChallengeStatus.Declined, ChallengeStatus.Forfeit]) {
      expect(isReportableChallenge(challenge(status), "me")).toBe(false);
    }
  });

  it("ignores accepted challenges between other players", () => {
    expect(isReportableChallenge(challenge(ChallengeStatus.Accepted, "rival", "other"), "me")).toBe(false);
  });

  it("keeps every accepted challenge the viewer has to report", () => {
    const challenges = [
      challenge(ChallengeStatus.Accepted, "me", "rival"),
      challenge(ChallengeStatus.Accepted, "other", "me"),
      challenge(ChallengeStatus.Pending, "me", "third"),
      challenge(ChallengeStatus.Accepted, "rival", "other")
    ];

    expect(selectReportableChallenges(challenges, "me").map((entry) => entry.id)).toEqual([
      challenges[0].id,
      challenges[1].id
    ]);
  });

  it("selects nothing without a signed-in viewer", () => {
    expect(selectReportableChallenges([challenge(ChallengeStatus.Accepted)], null)).toEqual([]);
    expect(selectReportableChallenges([challenge(ChallengeStatus.Accepted)], undefined)).toEqual([]);
  });

  it("resolves the opponent from either side of the challenge", () => {
    expect(getChallengeOpponentId(challenge(ChallengeStatus.Accepted, "me", "rival"), "me")).toBe("rival");
    expect(getChallengeOpponentId(challenge(ChallengeStatus.Accepted, "rival", "me"), "me")).toBe("rival");
    expect(getChallengeOpponentId(challenge(ChallengeStatus.Accepted, "rival", "other"), "me")).toBeNull();
  });

  it("maps the winner choice onto explicit match participants", () => {
    expect(resolveMatchParticipants({ viewerId: "me", opponentId: "rival", winner: "viewer" })).toEqual({
      winnerId: "me",
      loserId: "rival"
    });
    expect(resolveMatchParticipants({ viewerId: "me", opponentId: "rival", winner: "opponent" })).toEqual({
      winnerId: "rival",
      loserId: "me"
    });
  });
});
