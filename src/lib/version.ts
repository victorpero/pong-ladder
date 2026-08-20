export const productName = "Pong Ladder";

/** Where the browser remembers the release a viewer has already seen. */
export const lastSeenReleaseStorageKey = "pong-ladder:last-seen-release";

const versionPattern = /^(\d+)\.(\d+)\.(\d+)$/;

export function parseVersion(version: string) {
  const match = versionPattern.exec(version);

  if (!match) {
    throw new Error(`Release version must be MAJOR.MINOR.PATCH: received "${version}".`);
  }

  return { major: Number(match[1]), minor: Number(match[2]), patch: Number(match[3]) };
}

export function isValidVersion(version: string) {
  return versionPattern.test(version);
}

/** Negative when `a` is older, positive when `a` is newer, zero when equal. */
export function compareVersions(a: string, b: string) {
  const left = parseVersion(a);
  const right = parseVersion(b);

  return left.major - right.major || left.minor - right.minor || left.patch - right.patch;
}

/**
 * Production builds show the released version verbatim so it matches the Git
 * tag and the published GitHub Release. Every other build is marked so a
 * development version is never mistaken for a deployed one.
 */
export function formatVersionLabel(
  version: string,
  { isProduction, developmentLabel = "dev" }: { isProduction: boolean; developmentLabel?: string }
) {
  return isProduction ? `${productName} v${version}` : `${productName} v${version} (${developmentLabel})`;
}

/**
 * Drives the subtle What's new indicator. A viewer with nothing stored, or with
 * a stored value this build cannot make sense of, is never nagged.
 */
export function hasUnseenRelease(currentVersion: string, lastSeenVersion: string | null) {
  if (!lastSeenVersion || !isValidVersion(lastSeenVersion) || !isValidVersion(currentVersion)) {
    return false;
  }

  return compareVersions(currentVersion, lastSeenVersion) > 0;
}
