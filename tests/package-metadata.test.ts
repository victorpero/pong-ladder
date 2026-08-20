import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { findPackageVersionDrift } from "@/lib/package-metadata";
import { getCurrentVersion } from "@/lib/release-notes";

function metadata(overrides: Partial<Record<string, string>> = {}) {
  return {
    packageVersion: "1.0.0",
    lockVersion: "1.0.0",
    lockRootVersion: "1.0.0",
    ...overrides
  } as { packageVersion: string; lockVersion: string; lockRootVersion: string };
}

describe("findPackageVersionDrift", () => {
  it("reports nothing when every field matches the release", () => {
    expect(findPackageVersionDrift("1.0.0", metadata())).toEqual([]);
  });

  it("catches a drifted package.json version", () => {
    expect(findPackageVersionDrift("1.0.0", metadata({ packageVersion: "0.9.9" }))).toEqual([
      "package.json version is 0.9.9"
    ]);
  });

  it("catches a drifted top-level lockfile version", () => {
    expect(findPackageVersionDrift("1.0.0", metadata({ lockVersion: "0.9.9" }))).toEqual([
      "package-lock.json version is 0.9.9"
    ]);
  });

  // npm records the root package version twice. Checking only the top-level
  // entry let the nested one drift undetected.
  it("catches a drifted packages[\"\"] lockfile version", () => {
    expect(findPackageVersionDrift("1.0.0", metadata({ lockRootVersion: "0.9.9" }))).toEqual([
      'package-lock.json packages[""].version is 0.9.9'
    ]);
  });

  it("reports every drifted field at once", () => {
    const drift = findPackageVersionDrift(
      "1.0.0",
      metadata({ packageVersion: "0.9.9", lockVersion: "0.8.0", lockRootVersion: "0.7.0" })
    );

    expect(drift).toHaveLength(3);
  });

  it("describes a missing field rather than printing undefined", () => {
    expect(findPackageVersionDrift("1.0.0", metadata({ lockRootVersion: undefined as unknown as string }))).toEqual([
      'package-lock.json packages[""].version is missing'
    ]);
  });
});

describe("the repository package metadata", () => {
  it("records the released version in package.json and both lockfile root entries", () => {
    const packageJson = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8"));
    const lock = JSON.parse(readFileSync(new URL("../package-lock.json", import.meta.url), "utf8"));

    expect(
      findPackageVersionDrift(getCurrentVersion(), {
        packageVersion: packageJson.version,
        lockVersion: lock.version,
        lockRootVersion: lock.packages[""].version
      })
    ).toEqual([]);
  });
});
