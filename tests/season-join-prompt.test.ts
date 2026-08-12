import { describe, expect, it } from "vitest";
import { isSeasonJoinSubmitDisabled, shouldShowSeasonJoinPrompt } from "@/lib/season-join-prompt";

describe("shouldShowSeasonJoinPrompt", () => {
  it("prompts a player who has not joined the active season", () => {
    expect(shouldShowSeasonJoinPrompt({ joined: false, hasActiveSeason: true })).toBe(true);
  });

  it("hides the prompt once the player has joined", () => {
    expect(shouldShowSeasonJoinPrompt({ joined: true, hasActiveSeason: true })).toBe(false);
  });

  it("hides the prompt when there is no active season to join", () => {
    expect(shouldShowSeasonJoinPrompt({ joined: false, hasActiveSeason: false })).toBe(false);
  });

  it("hides the prompt when a joined player has no active season", () => {
    expect(shouldShowSeasonJoinPrompt({ joined: true, hasActiveSeason: false })).toBe(false);
  });
});

describe("isSeasonJoinSubmitDisabled", () => {
  it("accepts a submission from a player who has not joined", () => {
    expect(isSeasonJoinSubmitDisabled({ joined: false, hasActiveSeason: true, pending: false })).toBe(false);
  });

  it("blocks a duplicate submission while the join is pending", () => {
    expect(isSeasonJoinSubmitDisabled({ joined: false, hasActiveSeason: true, pending: true })).toBe(true);
  });

  it("blocks a submission from a player who already joined", () => {
    expect(isSeasonJoinSubmitDisabled({ joined: true, hasActiveSeason: true, pending: false })).toBe(true);
  });

  it("blocks a submission when there is no active season", () => {
    expect(isSeasonJoinSubmitDisabled({ joined: false, hasActiveSeason: false, pending: false })).toBe(true);
  });
});
