import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { SUPPORTED_LOCALES } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/dictionary";
import {
  formatReleaseDate,
  getCurrentRelease,
  getCurrentVersion,
  getReleases,
  isValidReleaseDate,
  parseReleases,
  releaseChangeGroups,
  renderReleaseBody
} from "@/lib/release-notes";

/** Every entry carries all supported languages, exactly as a real release must. */
function text(en: string, sv = `${en} (sv)`) {
  return { en, sv };
}

function releaseData(overrides: Record<string, unknown> = {}) {
  return {
    releases: [
      {
        version: "1.1.0",
        date: "2026-02-01",
        summary: text("Second release."),
        changes: { new: [text("Something new.")], fixed: [text("Something fixed.")] }
      },
      {
        version: "1.0.0",
        date: "2026-01-01",
        changes: { new: [text("The first release.")] }
      }
    ],
    ...overrides
  };
}

describe("parseReleases", () => {
  it("reads well-formed release data newest first", () => {
    const releases = parseReleases(releaseData());

    expect(releases.map((release) => release.version)).toEqual(["1.1.0", "1.0.0"]);
    expect(releases[0].summary?.en).toBe("Second release.");
    expect(releases[1].summary).toBeUndefined();
  });

  it("drops empty change groups instead of rendering an empty heading", () => {
    const releases = parseReleases({
      releases: [{ version: "1.0.0", date: "2026-01-01", changes: { new: [text("Added.")], fixed: [] } }]
    });

    expect(releases[0].changes.fixed).toBeUndefined();
    expect(releases[0].changes.new).toEqual([text("Added.")]);
  });

  it("rejects data that is not a releases array", () => {
    expect(() => parseReleases(null)).toThrow(/releases array/);
    expect(() => parseReleases({})).toThrow(/releases array/);
    expect(() => parseReleases({ releases: {} })).toThrow(/releases array/);
  });

  it("rejects an empty release history", () => {
    expect(() => parseReleases({ releases: [] })).toThrow(/at least one release/);
  });

  it("rejects releases that are not listed newest first", () => {
    const outOfOrder = {
      releases: [
        { version: "1.0.0", date: "2026-01-01", changes: { new: [text("First.")] } },
        { version: "1.1.0", date: "2026-02-01", changes: { new: [text("Second.")] } }
      ]
    };

    expect(() => parseReleases(outOfOrder)).toThrow(/newest first/);
  });

  it("rejects a duplicated version", () => {
    const duplicated = {
      releases: [
        { version: "1.0.0", date: "2026-01-01", changes: { new: [text("First.")] } },
        { version: "1.0.0", date: "2026-01-01", changes: { new: [text("Again.")] } }
      ]
    };

    expect(() => parseReleases(duplicated)).toThrow(/more than once/);
  });

  it("rejects a malformed version", () => {
    expect(() =>
      parseReleases({ releases: [{ version: "v1.0", date: "2026-01-01", changes: { new: [text("x")] } }] })
    ).toThrow(/MAJOR.MINOR.PATCH/);
  });

  it("rejects a missing or malformed date", () => {
    expect(() => parseReleases({ releases: [{ version: "1.0.0", changes: { new: [text("x")] } }] })).toThrow(
      /YYYY-MM-DD/
    );
    expect(() =>
      parseReleases({ releases: [{ version: "1.0.0", date: "1 Jan 2026", changes: { new: [text("x")] } }] })
    ).toThrow(/YYYY-MM-DD/);
  });

  // Date normalizes 2026-02-31 to 2026-03-03, which would render a release on
  // a day its notes never claimed.
  it("rejects a date that looks well formed but is not a real calendar day", () => {
    for (const date of ["2026-02-31", "2026-04-31", "2026-02-30", "2025-02-29"]) {
      expect(() =>
        parseReleases({ releases: [{ version: "1.0.0", date, changes: { new: [text("x")] } }] })
      ).toThrow(/real calendar date/);
    }
  });

  it("accepts a genuine leap day", () => {
    const [release] = parseReleases({
      releases: [{ version: "1.0.0", date: "2024-02-29", changes: { new: [text("x")] } }]
    });

    expect(release.date).toBe("2024-02-29");
  });

  it("rejects unsupported change groups so notes stay grouped consistently", () => {
    expect(() =>
      parseReleases({ releases: [{ version: "1.0.0", date: "2026-01-01", changes: { removed: [text("x")] } }] })
    ).toThrow(/unsupported change groups/);
  });

  it("rejects blank or non-text change entries", () => {
    expect(() =>
      parseReleases({
        releases: [{ version: "1.0.0", date: "2026-01-01", changes: { new: [text("  ", "  ")] } }]
      })
    ).toThrow(/missing (en|sv) text/);
    expect(() =>
      parseReleases({ releases: [{ version: "1.0.0", date: "2026-01-01", changes: { new: ["plain string"] } }] })
    ).toThrow(/must be an object with one entry per supported language/);
    expect(() =>
      parseReleases({ releases: [{ version: "1.0.0", date: "2026-01-01", changes: { new: [7] } }] })
    ).toThrow(/must be an object with one entry per supported language/);
  });

  it("rejects a release that lists no changes at all", () => {
    expect(() => parseReleases({ releases: [{ version: "1.0.0", date: "2026-01-01", changes: {} }] })).toThrow(
      /does not list any changes/
    );
  });
});

describe("formatReleaseDate", () => {
  it("formats a calendar date without shifting it across time zones", () => {
    expect(formatReleaseDate("2026-01-01", "en")).toBe("Jan 1, 2026");
    expect(formatReleaseDate("2026-12-31", "en")).toBe("Dec 31, 2026");
  });

  it("formats the same day in each language", () => {
    for (const locale of SUPPORTED_LOCALES) {
      expect(formatReleaseDate("2026-01-01", locale)).toContain("2026");
    }

    expect(formatReleaseDate("2026-01-01", "sv")).not.toBe(formatReleaseDate("2026-01-01", "en"));
  });
});

describe("renderReleaseBody", () => {
  it("renders the summary and every populated group in a stable order", () => {
    const [latest] = parseReleases(releaseData());

    expect(renderReleaseBody(latest, "en")).toBe(
      ["Second release.", "", "### New", "", "- Something new.", "", "### Fixed", "", "- Something fixed.", ""].join(
        "\n"
      )
    );
  });

  it("omits the summary when a release has none", () => {
    const [, first] = parseReleases(releaseData());

    expect(renderReleaseBody(first, "en")).toBe("### New\n\n- The first release.\n");
  });

  it("renders the requested language, headings included", () => {
    const [latest] = parseReleases(releaseData());
    const swedish = renderReleaseBody(latest, "sv");

    expect(swedish).toContain("Second release. (sv)");
    expect(swedish).toContain(`### ${getDictionary("sv").changelog.groups.new}`);
    expect(swedish).not.toContain("- Something new.\n");
  });
});

describe("the repository release data", () => {
  it("is valid and exposes a current release", () => {
    const releases = getReleases();

    expect(releases.length).toBeGreaterThan(0);
    expect(getCurrentRelease()).toBe(releases[0]);
    expect(getCurrentVersion()).toBe(releases[0].version);
  });

  it("stays in step with the version recorded in package metadata", () => {
    const packageJson = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8"));
    const lock = JSON.parse(readFileSync(new URL("../package-lock.json", import.meta.url), "utf8"));

    expect(packageJson.version).toBe(getCurrentVersion());
    expect(lock.version).toBe(getCurrentVersion());
    expect(lock.packages[""].version).toBe(getCurrentVersion());
  });

  it("dates every release with a real calendar day", () => {
    for (const release of getReleases()) {
      expect(isValidReleaseDate(release.date)).toBe(true);
    }
  });

  it("labels every change group in every supported language", () => {
    for (const locale of SUPPORTED_LOCALES) {
      for (const group of releaseChangeGroups) {
        expect(getDictionary(locale).changelog.groups[group].trim()).not.toBe("");
      }
    }
  });

  it("produces a non-empty GitHub Release body for every release and language", () => {
    for (const release of getReleases()) {
      for (const locale of SUPPORTED_LOCALES) {
        expect(renderReleaseBody(release, locale).trim()).not.toBe("");
      }
    }
  });

  // A half-translated changelog is the failure the localized notes exist to prevent.
  it("writes every release note in every supported language", () => {
    for (const release of getReleases()) {
      for (const locale of SUPPORTED_LOCALES) {
        expect(release.summary?.[locale]?.trim() ?? "ok").not.toBe("");

        for (const group of releaseChangeGroups) {
          for (const item of release.changes[group] ?? []) {
            expect(item[locale].trim()).not.toBe("");
          }
        }
      }
    }
  });
});

describe("isValidReleaseDate", () => {
  it("accepts real calendar days, including leap days", () => {
    expect(isValidReleaseDate("2026-08-20")).toBe(true);
    expect(isValidReleaseDate("2024-02-29")).toBe(true);
    expect(isValidReleaseDate("2026-12-31")).toBe(true);
  });

  it("rejects impossible days that Date would silently normalize", () => {
    expect(isValidReleaseDate("2026-02-31")).toBe(false);
    expect(isValidReleaseDate("2026-04-31")).toBe(false);
    expect(isValidReleaseDate("2025-02-29")).toBe(false);
  });

  it("rejects out-of-range months and days", () => {
    expect(isValidReleaseDate("2026-13-01")).toBe(false);
    expect(isValidReleaseDate("2026-00-10")).toBe(false);
    expect(isValidReleaseDate("2026-01-32")).toBe(false);
  });

  it("rejects anything that is not a bare YYYY-MM-DD value", () => {
    expect(isValidReleaseDate("2026-8-20")).toBe(false);
    expect(isValidReleaseDate("2026-08-20T00:00:00Z")).toBe(false);
    expect(isValidReleaseDate("")).toBe(false);
  });
});
