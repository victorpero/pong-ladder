import { describe, expect, it } from "vitest";
import { SUPPORTED_LOCALES } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/dictionary";
import { changelogPath, changelogPathForPathname, organizationNavigationSections } from "@/lib/navigation";

describe("organizationNavigationSections", () => {
  it("does not offer a top-level Players tab", () => {
    expect(organizationNavigationSections).not.toContain("players");
  });

  it("keeps the remaining primary destinations in order", () => {
    expect([...organizationNavigationSections]).toEqual(["ladder", "matches", "challenges", "teams", "rules"]);
  });

  it("has a label in every supported language for every destination", () => {
    for (const locale of SUPPORTED_LOCALES) {
      const nav = getDictionary(locale).nav;

      for (const section of organizationNavigationSections) {
        expect(nav[section].trim()).not.toBe("");
      }
    }
  });

  // The dictionaries no longer carry a nav label for the removed tab.
  it("leaves no orphaned Players label in the navigation dictionaries", () => {
    for (const locale of SUPPORTED_LOCALES) {
      expect(Object.keys(getDictionary(locale).nav)).not.toContain("players");
    }
  });
});

describe("changelogPathForPathname", () => {
  it("keeps the organization and language context inside an organization", () => {
    expect(changelogPathForPathname("sv", "/sv/org/polisen/ladder")).toBe("/sv/org/polisen/changelog");
    expect(changelogPathForPathname("en", "/en/org/polisen/ladder")).toBe("/en/org/polisen/changelog");
  });

  it("keeps the organization context on nested organization routes", () => {
    expect(changelogPathForPathname("en", "/en/org/polisen/players/player-1")).toBe(
      "/en/org/polisen/changelog"
    );
  });

  it("reads an organization from a legacy unprefixed path", () => {
    expect(changelogPathForPathname("sv", "/org/polisen/ladder")).toBe("/sv/org/polisen/changelog");
  });

  it("encodes organization slugs", () => {
    expect(changelogPathForPathname("en", "/en/org/team%20one/ladder")).toBe("/en/org/team%20one/changelog");
  });

  it("falls back to the application-level changelog outside an organization", () => {
    expect(changelogPathForPathname("sv", "/sv/organizations")).toBe(`/sv${changelogPath}`);
    expect(changelogPathForPathname("en", "/en/login")).toBe(`/en${changelogPath}`);
  });

  it("carries the requested language even when the path shows another", () => {
    expect(changelogPathForPathname("en", "/sv/organizations")).toBe("/en/changelog");
  });
});
