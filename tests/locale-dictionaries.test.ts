import { describe, expect, it } from "vitest";
import { SUPPORTED_LOCALES } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/dictionary";
import { plural, t } from "@/lib/i18n/format";

type Tree = { [key: string]: string | Tree };

function keyPaths(value: Tree, prefix = ""): string[] {
  return Object.entries(value).flatMap(([key, entry]) => {
    const path = prefix ? `${prefix}.${key}` : key;

    return typeof entry === "string" ? [path] : keyPaths(entry, path);
  });
}

const english = getDictionary("en") as unknown as Tree;
const swedish = getDictionary("sv") as unknown as Tree;

describe("dictionary parity", () => {
  it("keeps both languages structurally in sync", () => {
    expect(keyPaths(swedish).sort()).toEqual(keyPaths(english).sort());
  });

  it("has no empty translations", () => {
    for (const locale of SUPPORTED_LOCALES) {
      const dictionary = getDictionary(locale) as unknown as Tree;
      const empty = keyPaths(dictionary).filter((path) => resolve(dictionary, path).trim().length === 0);

      expect({ locale, empty }).toEqual({ locale, empty: [] });
    }
  });

  it("keeps every placeholder identical across languages", () => {
    for (const path of keyPaths(english)) {
      expect({ path, placeholders: placeholders(resolve(swedish, path)) }).toEqual({
        path,
        placeholders: placeholders(resolve(english, path))
      });
    }
  });

  it("validates the locale before selecting a dictionary", () => {
    expect(getDictionary("de")).toBe(getDictionary("sv"));
    expect(getDictionary(undefined)).toBe(getDictionary("sv"));
  });
});

describe("representative rendering", () => {
  it("renders the same screen differently in each language", () => {
    expect(getDictionary("en").ladder.standingsHeading).toBe("Current standings");
    expect(getDictionary("sv").ladder.standingsHeading).toBe("Aktuell ställning");
    expect(getDictionary("en").nav.challenges).toBe("Challenges");
    expect(getDictionary("sv").nav.challenges).toBe("Utmaningar");
    expect(getDictionary("en").challenges.status.Pending).toBe("Pending");
    expect(getDictionary("sv").challenges.status.Pending).toBe("Väntar");
  });

  it("leaves organization, brand, and player names untouched while translating around them", () => {
    expect(t(getDictionary("sv").invite.heading, { organization: "Polisen" })).toBe(
      "Bjud in personer till Polisen"
    );
    expect(t(getDictionary("en").invite.heading, { organization: "Polisen" })).toBe("Invite people to Polisen");
    expect(t(getDictionary("sv").account.fullName, { name: "Victor Olofsson" })).toContain("Victor Olofsson");
    expect(getDictionary("sv").metadata.title).toBe("Pong Ladder");
    expect(getDictionary("sv").rules.heading).toContain("Pong Ladder");
  });

  it("selects singular and plural forms per language", () => {
    expect(plural(1, getDictionary("en").teams.memberCount)).toBe("1 member");
    expect(plural(3, getDictionary("en").teams.memberCount)).toBe("3 members");
    expect(plural(1, getDictionary("sv").teams.memberCount)).toBe("1 medlem");
    expect(plural(3, getDictionary("sv").teams.memberCount)).toBe("3 medlemmar");
  });
});

function resolve(tree: Tree, path: string) {
  return path.split(".").reduce<string | Tree>((value, key) => (value as Tree)[key], tree) as string;
}

function placeholders(value: string) {
  return [...value.matchAll(/\{(\w+)\}/g)].map((match) => match[1]).sort();
}
