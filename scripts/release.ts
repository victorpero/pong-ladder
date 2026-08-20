/**
 * Release helper backed by src/data/releases.json, the single source of truth
 * for the in-app version, the Git tag, and the published GitHub Release.
 *
 *   tsx scripts/release.ts version   prints the current version, for example 1.0.0
 *   tsx scripts/release.ts notes [sv|en]
 *                                    prints the GitHub Release body, English by default
 *   tsx scripts/release.ts sync      rewrites the package metadata to that version
 *   tsx scripts/release.ts check     fails when the package metadata has drifted
 */
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { isSupportedLocale, type Locale } from "../src/lib/i18n/config";
import { findPackageVersionDrift, type PackageMetadata } from "../src/lib/package-metadata";
import { getCurrentRelease, renderReleaseBody } from "../src/lib/release-notes";

// GitHub Releases are read by an international audience, so the published body
// defaults to English. Pass another supported language to render that instead.
const DEFAULT_NOTES_LOCALE: Locale = "en";

const repositoryRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const packageJsonPath = join(repositoryRoot, "package.json");
const packageLockPath = join(repositoryRoot, "package-lock.json");

function readPackageMetadata(): PackageMetadata {
  const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf8"));
  const lock = JSON.parse(readFileSync(packageLockPath, "utf8"));

  return {
    packageVersion: packageJson.version,
    lockVersion: lock.version,
    lockRootVersion: lock.packages?.[""]?.version
  };
}

function syncPackageVersion(version: string) {
  const contents = readFileSync(packageJsonPath, "utf8");
  const updated = contents.replace(/^(\s*"version":\s*)"[^"]*"/m, `$1"${version}"`);

  if (updated === contents && JSON.parse(contents).version !== version) {
    throw new Error("Could not find a version field to update in package.json.");
  }

  writeFileSync(packageJsonPath, updated);
  syncLockVersion(version);
}

/**
 * Both root version entries move together. The lockfile is rewritten from its
 * parsed form, which npm writes back byte for byte, but only after confirming
 * this file really is in npm's format so a release can never reformat it.
 */
function syncLockVersion(version: string) {
  const contents = readFileSync(packageLockPath, "utf8");
  const lock = JSON.parse(contents);

  if (lock.version === version && lock.packages?.[""]?.version === version) {
    return;
  }

  if (`${JSON.stringify(lock, null, 2)}\n` !== contents) {
    throw new Error(
      "package-lock.json is not in npm's formatting. Run \"npm install --package-lock-only\" before syncing."
    );
  }

  lock.version = version;

  if (lock.packages?.[""]) {
    lock.packages[""].version = version;
  }

  writeFileSync(packageLockPath, `${JSON.stringify(lock, null, 2)}\n`);
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
    process.stdout.write(`Package metadata set to ${release.version}\n`);
    break;
  case "check": {
    const drifted = findPackageVersionDrift(release.version, readPackageMetadata());

    if (drifted.length > 0) {
      process.stderr.write(
        `${drifted.join(", ")}, but the newest release is ${release.version}. Run "npm run release:sync".\n`
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
