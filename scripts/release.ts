/**
 * Release helper backed by src/data/releases.json, the single source of truth
 * for the in-app version, the Git tag, and the published GitHub Release.
 *
 *   tsx scripts/release.ts version   prints the current version, for example 1.0.0
 *   tsx scripts/release.ts notes     prints the GitHub Release body for that version
 *   tsx scripts/release.ts sync      rewrites package.json to the current version
 *   tsx scripts/release.ts check     fails when package.json has drifted
 */
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { getCurrentRelease, renderReleaseBody } from "../src/lib/release-notes";
import { isSupportedLocale, type Locale } from "../src/lib/i18n/config";

// GitHub Releases are read by an international audience, so the published body
// defaults to English. Pass another supported language to render that instead.
const DEFAULT_NOTES_LOCALE: Locale = "en";

const repositoryRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const packageJsonPath = join(repositoryRoot, "package.json");
const packageLockPath = join(repositoryRoot, "package-lock.json");

function readPackageVersion() {
  return JSON.parse(readFileSync(packageJsonPath, "utf8")).version as string;
}

function syncPackageVersion(version: string) {
  const contents = readFileSync(packageJsonPath, "utf8");
  const updated = contents.replace(/^(\s*"version":\s*)"[^"]*"/m, `$1"${version}"`);

  if (updated === contents) {
    throw new Error("Could not find a version field to update in package.json.");
  }

  writeFileSync(packageJsonPath, updated);
  syncLockVersion(version);
}

/**
 * The lockfile repeats the root version twice, and only those two entries may
 * move. Rewriting the parsed JSON would reformat the whole file, so the two
 * root occurrences are replaced positionally instead.
 */
function syncLockVersion(version: string) {
  const contents = readFileSync(packageLockPath, "utf8");
  const lock = JSON.parse(contents);
  const previous = lock.version as string;

  if (previous === version) {
    return;
  }

  let replacements = 0;
  const updated = contents.replace(new RegExp(`("version":\\s*)"${previous}"`, "g"), (match, prefix) => {
    replacements += 1;

    return replacements <= 2 ? `${prefix}"${version}"` : match;
  });

  if (replacements < 2) {
    throw new Error("Could not find the root version entries in package-lock.json.");
  }

  writeFileSync(packageLockPath, updated);
}

const command = process.argv[2] ?? "version";
const release = getCurrentRelease();

switch (command) {
  case "version":
    process.stdout.write(`${release.version}\n`);
    break;
  case "notes": {
    const requested = process.argv[3];

    if (requested !== undefined && !isSupportedLocale(requested)) {
      process.stderr.write(`Unsupported language "${requested}" for release notes.\n`);
      process.exit(1);
    }

    process.stdout.write(renderReleaseBody(release, requested ?? DEFAULT_NOTES_LOCALE));
    break;
  }
  case "sync":
    syncPackageVersion(release.version);
    process.stdout.write(`package.json set to ${release.version}\n`);
    break;
  case "check": {
    const packageVersion = readPackageVersion();

    const lockVersion = JSON.parse(readFileSync(packageLockPath, "utf8")).version as string;
    const drifted = [
      packageVersion === release.version ? null : `package.json is ${packageVersion}`,
      lockVersion === release.version ? null : `package-lock.json is ${lockVersion}`
    ].filter((entry): entry is string => entry !== null);

    if (drifted.length > 0) {
      process.stderr.write(
        `${drifted.join(" and ")}, but the newest release is ${release.version}. Run "npm run release:sync".\n`
      );
      process.exit(1);
    }

    process.stdout.write(`Package metadata matches release ${release.version}\n`);
    break;
  }
  default:
    process.stderr.write(`Unknown command "${command}". Use version, notes, sync, or check.\n`);
    process.exit(1);
}
