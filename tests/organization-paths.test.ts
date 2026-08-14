import { describe, expect, it } from "vitest";
import {
  organizationPath,
  organizationSlugFromPath,
  organizationsPath,
  postAuthenticationPath
} from "@/lib/organization-paths";

describe("organization navigation", () => {
  it("builds organization-scoped routes for sections and nested resources", () => {
    expect(organizationPath("polisen")).toBe("/org/polisen/ladder");
    expect(organizationPath("polisen", "matches")).toBe("/org/polisen/matches");
    expect(organizationPath("polisen", "players", "player-1")).toBe("/org/polisen/players/player-1");
  });

  it("reads the selected organization only from scoped paths", () => {
    expect(organizationSlugFromPath("/org/polisen/challenges")).toBe("polisen");
    expect(organizationSlugFromPath("/organizations")).toBeNull();
    expect(organizationSlugFromPath("/ladder")).toBeNull();
  });

  it("always returns to organization selection after authentication", () => {
    expect(postAuthenticationPath("/org/polisen/ladder")).toBe(organizationsPath);
    expect(postAuthenticationPath("/ladder")).toBe(organizationsPath);
    expect(postAuthenticationPath("https://example.com")).toBe(organizationsPath);
  });

  it("preserves a valid invitation handoff through authentication", () => {
    expect(postAuthenticationPath("/join/invitation-token")).toBe("/join/invitation-token");
    expect(postAuthenticationPath("//example.com/join/token")).toBe(organizationsPath);
  });
});
