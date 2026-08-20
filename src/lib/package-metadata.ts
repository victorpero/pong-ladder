/**
 * npm records the root package version twice in package-lock.json: once at the
 * top level and once at `packages[""]`. Both have to agree with the newest
 * release entry, otherwise the metadata claims a version nothing released.
 */
export type PackageMetadata = {
  packageVersion: string;
  lockVersion: string;
  lockRootVersion: string;
};

export const packageMetadataFields: readonly (keyof PackageMetadata)[] = [
  "packageVersion",
  "lockVersion",
  "lockRootVersion"
];

const fieldLabels: Record<keyof PackageMetadata, string> = {
  packageVersion: "package.json version",
  lockVersion: "package-lock.json version",
  lockRootVersion: 'package-lock.json packages[""].version'
};

/** Describes every field that disagrees with the released version. */
export function findPackageVersionDrift(releaseVersion: string, metadata: PackageMetadata) {
  return packageMetadataFields
    .filter((field) => metadata[field] !== releaseVersion)
    .map((field) => `${fieldLabels[field]} is ${describe(metadata[field])}`);
}

function describe(value: string) {
  return value === undefined || value === null || value === "" ? "missing" : value;
}
