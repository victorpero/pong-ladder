import { describe, expect, it } from "vitest";
import {
  appPath,
  loginPath,
  newOrganizationPath,
  organizationPath,
  organizationSlugFromPath,
  organizationsPath,
  postAuthenticationPath
} from "@/lib/organization-paths";

describe("organization navigation", () => {
  it("builds locale-prefixed organization routes for sections and nested resources", () => {
    expect(organizationPath("sv", "polisen")).toBe("/sv/org/polisen/ladder");
    expect(organizationPath("en", "polisen")).toBe("/en/org/polisen/ladder");
    expect(organizationPath("sv", "polisen", "matches")).toBe("/sv/org/polisen/matches");
    expect(organizationPath("en", "polisen", "players", "player-1")).toBe("/en/org/polisen/players/player-1");
  });

  it("prefixes global routes with the active language", () => {
    expect(organizationsPath("sv")).toBe("/sv/organizations");
    expect(newOrganizationPath("en")).toBe("/en/organizations/new");
    expect(appPath("sv", "/verify-email")).toBe("/sv/verify-email");
    expect(loginPath("en", "/en/org/polisen/ladder")).toBe("/en/login?next=%2Fen%2Forg%2Fpolisen%2Fladder");
  });

  it("reads the selected organization from scoped paths with or without a locale", () => {
    expect(organizationSlugFromPath("/sv/org/polisen/challenges")).toBe("polisen");
    expect(organizationSlugFromPath("/org/polisen/challenges")).toBe("polisen");
    expect(organizationSlugFromPath("/sv/organizations")).toBeNull();
    expect(organizationSlugFromPath("/sv/ladder")).toBeNull();
  });

  it("always returns to organization selection after authentication", () => {
    expect(postAuthenticationPath("sv", "/sv/org/polisen/ladder")).toBe("/sv/organizations");
    expect(postAuthenticationPath("sv", "/ladder")).toBe("/sv/organizations");
    expect(postAuthenticationPath("en", "https://example.com")).toBe("/en/organizations");
  });

  it("preserves a valid invitation handoff through authentication in the chosen language", () => {
    expect(postAuthenticationPath("sv", "/sv/join/invitation-token")).toBe("/sv/join/invitation-token");
    expect(postAuthenticationPath("en", "/sv/join/invitation-token")).toBe("/en/join/invitation-token");
    expect(postAuthenticationPath("sv", "/join/invitation-token")).toBe("/sv/join/invitation-token");
    expect(postAuthenticationPath("sv", "//example.com/join/token")).toBe("/sv/organizations");
  });
});
