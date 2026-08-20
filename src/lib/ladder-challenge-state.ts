import { ChallengeStatus } from "@prisma/client";
import { canChallengePlayer, findActiveChallengeBetween, type ChallengeRulePlayer } from "@/lib/challenge-rules";

export type LadderChallengeParticipant = ChallengeRulePlayer & { userId: string };

export type LadderChallengeRelationship = {
  id: string;
  challengerId: string;
  challengedId: string;
  status: ChallengeStatus | string;
};

/**
 * What a single ladder row may offer the signed-in player.
 *
 * - `unavailable`: nobody is signed in, or the viewer has not joined the season.
 * - `self`: the viewer's own row, which never offers a self-challenge.
 * - `ineligible`: on the ladder, but outside the challenge window.
 * - `available`: the viewer may open a challenge.
 * - `outgoing` / `incoming`: a pending challenge, told apart by direction.
 * - `active`: an accepted challenge waiting for its match result.
 */
export type LadderChallengeState =
  | { kind: "unavailable" }
  | { kind: "self" }
  | { kind: "ineligible" }
  | { kind: "available" }
  | { kind: "outgoing"; challengeId: string }
  | { kind: "incoming"; challengeId: string }
  | { kind: "active"; challengeId: string };

/**
 * Derives the row control from the same rules the server enforces on creation,
 * so the ladder can never offer a challenge `createChallenge` would reject.
 *
 * `challenges` may contain finished challenges; only the ones that still tie the
 * two players together count, which is what returns a row to its normal
 * eligibility state once a challenge is completed, declined or forfeited.
 */
export function getLadderChallengeState({
  viewer,
  row,
  challenges
}: {
  viewer: LadderChallengeParticipant | null;
  row: LadderChallengeParticipant;
  challenges: LadderChallengeRelationship[];
}): LadderChallengeState {
  if (!viewer) {
    return { kind: "unavailable" };
  }

  if (viewer.userId === row.userId) {
    return { kind: "self" };
  }

  const existing = findActiveChallengeBetween(challenges, viewer.userId, row.userId);

  if (existing) {
    if (existing.status === ChallengeStatus.Accepted) {
      return { kind: "active", challengeId: existing.id };
    }

    return existing.challengerId === viewer.userId
      ? { kind: "outgoing", challengeId: existing.id }
      : { kind: "incoming", challengeId: existing.id };
  }

  return canChallengePlayer(viewer, row) ? { kind: "available" } : { kind: "ineligible" };
}

/** Row states for a whole ladder, keyed by user id. */
export function getLadderChallengeStates({
  viewerId,
  ladder,
  challenges
}: {
  viewerId: string | null;
  ladder: LadderChallengeParticipant[];
  challenges: LadderChallengeRelationship[];
}) {
  const viewer = viewerId ? ladder.find((entry) => entry.userId === viewerId) ?? null : null;

  return new Map(ladder.map((row) => [row.userId, getLadderChallengeState({ viewer, row, challenges })]));
}

/** Whether a row state renders a control at all, so the layout can reserve room only when it does. */
export function hasLadderChallengeControl(state: LadderChallengeState) {
  return state.kind === "available" || state.kind === "incoming" || state.kind === "outgoing" || state.kind === "active";
}
