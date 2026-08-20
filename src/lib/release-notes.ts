import releaseData from "@/data/releases.json";
import { SUPPORTED_LOCALES, type Locale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/dictionary";
import { compareVersions, parseVersion } from "@/lib/version";

// Ordered so the changelog and the generated GitHub Release body always group
// changes the same way. The headings themselves live in the dictionaries.
export const releaseChangeGroups = ["new", "improved", "fixed"] as const;

export type ReleaseChangeGroup = (typeof releaseChangeGroups)[number];

/**
 * Release-note prose is written once per supported language, exactly like the
 * interface dictionaries, so a Swedish reader never meets an English changelog
 * inside an otherwise Swedish application.
 */
export type LocalizedText = Record<Locale, string>;

export type Release = {
  version: string;
  date: string;
  summary?: LocalizedText;
  changes: Partial<Record<ReleaseChangeGroup, LocalizedText[]>>;
};

const datePattern = /^\d{4}-\d{2}-\d{2}$/;

/**
 * `Date` silently normalizes an impossible calendar date — 2026-02-31 becomes
 * 2026-03-03 — which would render a release on a different day than its notes
 * claim. Only a value that survives a UTC round trip is accepted, which also
 * keeps genuine leap days such as 2024-02-29 valid.
 */
export function isValidReleaseDate(date: string) {
  if (!datePattern.test(date)) {
    return false;
  }

  const parsed = new Date(`${date}T00:00:00Z`);

  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === date;
}

/**
 * Validates the structured release data. Release notes are the source of truth
 * for the in-app version, the Git tag, and the published GitHub Release, so bad
 * data has to fail loudly at build and test time rather than render silently.
 */
export function parseReleases(data: unknown): Release[] {
  if (typeof data !== "object" || data === null || !Array.isArray((data as { releases?: unknown }).releases)) {
    throw new Error("Release data must be an object with a releases array.");
  }

  const entries = (data as { releases: unknown[] }).releases;

  if (entries.length === 0) {
    throw new Error("Release data must contain at least one release.");
  }

  const releases = entries.map((entry, index) => parseRelease(entry, index));
  const seen = new Set<string>();

  releases.forEach((release, index) => {
    if (seen.has(release.version)) {
      throw new Error(`Release ${release.version} is listed more than once.`);
    }

    seen.add(release.version);

    const previous = releases[index - 1];

    if (previous && compareVersions(previous.version, release.version) <= 0) {
      throw new Error(
        `Releases must be listed newest first: ${previous.version} is not newer than ${release.version}.`
      );
    }
  });

  return releases;
}

function parseRelease(entry: unknown, index: number): Release {
  if (typeof entry !== "object" || entry === null) {
    throw new Error(`Release at position ${index} must be an object.`);
  }

  const candidate = entry as Record<string, unknown>;
  const version = candidate.version;
  const date = candidate.date;

  if (typeof version !== "string") {
    throw new Error(`Release at position ${index} is missing a version.`);
  }

  parseVersion(version);

  if (typeof date !== "string" || !isValidReleaseDate(date)) {
    throw new Error(`Release ${version} must have a real calendar date in YYYY-MM-DD form.`);
  }

  const summary =
    candidate.summary === undefined
      ? undefined
      : parseLocalizedText(candidate.summary, `Release ${version} summary`);
  const changes = parseChanges(candidate.changes, version);

  return summary === undefined ? { version, date, changes } : { version, date, summary, changes };
}

/** Every supported language has to be present, so a release can never half-translate itself. */
function parseLocalizedText(value: unknown, context: string): LocalizedText {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error(`${context} must be an object with one entry per supported language.`);
  }

  const source = value as Record<string, unknown>;
  const unsupported = Object.keys(source).filter((locale) => !SUPPORTED_LOCALES.includes(locale as Locale));

  if (unsupported.length > 0) {
    throw new Error(`${context} uses unsupported languages: ${unsupported.join(", ")}.`);
  }

  const text = {} as LocalizedText;

  for (const locale of SUPPORTED_LOCALES) {
    const entry = source[locale];

    if (typeof entry !== "string" || entry.trim() === "") {
      throw new Error(`${context} is missing ${locale} text.`);
    }

    text[locale] = entry;
  }

  return text;
}

function parseChanges(value: unknown, version: string): Release["changes"] {
  if (typeof value !== "object" || value === null) {
    throw new Error(`Release ${version} must have a changes object.`);
  }

  const source = value as Record<string, unknown>;
  const unknownGroups = Object.keys(source).filter(
    (group) => !releaseChangeGroups.includes(group as ReleaseChangeGroup)
  );

  if (unknownGroups.length > 0) {
    throw new Error(`Release ${version} uses unsupported change groups: ${unknownGroups.join(", ")}.`);
  }

  const changes: Release["changes"] = {};

  for (const group of releaseChangeGroups) {
    const items = source[group];

    if (items === undefined) {
      continue;
    }

    if (!Array.isArray(items)) {
      throw new Error(`Release ${version} has an invalid "${group}" list.`);
    }

    if (items.length > 0) {
      changes[group] = items.map((item, index) =>
        parseLocalizedText(item, `Release ${version} "${group}" entry ${index + 1}`)
      );
    }
  }

  if (releaseChangeGroups.every((group) => changes[group] === undefined)) {
    throw new Error(`Release ${version} does not list any changes.`);
  }

  return changes;
}

let cachedReleases: Release[] | null = null;

export function getReleases(): Release[] {
  cachedReleases ??= parseReleases(releaseData);

  return cachedReleases;
}

export function getCurrentRelease(): Release {
  return getReleases()[0];
}

/** The bare version, for example `1.0.0`. */
export function getCurrentVersion() {
  return getCurrentRelease().version;
}

/**
 * Release dates are calendar dates, not instants. Formatting in UTC keeps a
 * release from appearing to land a day early for viewers west of UTC.
 */
export function formatReleaseDate(date: string, locale: Locale) {
  return new Intl.DateTimeFormat(locale, {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC"
  }).format(new Date(`${date}T00:00:00Z`));
}

/**
 * Renders the published GitHub Release body from the same entry and the same
 * headings the changelog shows, so the notes cannot drift between GitHub and
 * the running application.
 */
export function renderReleaseBody(release: Release, locale: Locale) {
  const groups = getDictionary(locale).changelog.groups;
  const sections = releaseChangeGroups
    .map((group) => {
      const items = release.changes[group];

      if (!items) {
        return null;
      }

      return [`### ${groups[group]}`, "", ...items.map((item) => `- ${item[locale]}`)].join("\n");
    })
    .filter((section): section is string => section !== null);

  const blocks = release.summary ? [release.summary[locale], ...sections] : sections;

  return `${blocks.join("\n\n")}\n`;
}
