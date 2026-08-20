import { describe, expect, it } from "vitest";
import { compareVersions, formatVersionLabel, hasUnseenRelease, isValidVersion, parseVersion } from "@/lib/version";

describe("parseVersion", () => {
  it("reads semantic version parts", () => {
    expect(parseVersion("1.4.0")).toEqual({ major: 1, minor: 4, patch: 0 });
    expect(parseVersion("10.20.30")).toEqual({ major: 10, minor: 20, patch: 30 });
  });

  it("rejects anything that is not MAJOR.MINOR.PATCH", () => {
    expect(() => parseVersion("1.4")).toThrow(/MAJOR.MINOR.PATCH/);
    expect(() => parseVersion("v1.4.0")).toThrow(/MAJOR.MINOR.PATCH/);
    expect(() => parseVersion("1.4.0-rc.1")).toThrow(/MAJOR.MINOR.PATCH/);
    expect(() => parseVersion("")).toThrow(/MAJOR.MINOR.PATCH/);
  });
});

describe("isValidVersion", () => {
  it("accepts released versions and rejects the rest", () => {
    expect(isValidVersion("1.0.0")).toBe(true);
    expect(isValidVersion("v1.0.0")).toBe(false);
    expect(isValidVersion("nonsense")).toBe(false);
  });
});

describe("compareVersions", () => {
  it("orders by major, then minor, then patch", () => {
    expect(compareVersions("2.0.0", "1.9.9")).toBeGreaterThan(0);
    expect(compareVersions("1.2.0", "1.10.0")).toBeLessThan(0);
    expect(compareVersions("1.2.3", "1.2.4")).toBeLessThan(0);
    expect(compareVersions("1.2.3", "1.2.3")).toBe(0);
  });

  it("does not compare version parts as text", () => {
    expect(compareVersions("1.10.0", "1.9.0")).toBeGreaterThan(0);
  });
});

describe("formatVersionLabel", () => {
  it("shows the released version verbatim in production", () => {
    expect(formatVersionLabel("1.4.0", { isProduction: true })).toBe("Pong Ladder v1.4.0");
  });

  it("marks every other build so it cannot be mistaken for a deployed one", () => {
    expect(formatVersionLabel("1.4.0", { isProduction: false })).toBe("Pong Ladder v1.4.0 (dev)");
  });

  it("takes the development marker from the active language", () => {
    expect(formatVersionLabel("1.4.0", { isProduction: false, developmentLabel: "utveckling" })).toBe(
      "Pong Ladder v1.4.0 (utveckling)"
    );
  });

  it("leaves the product and version identifier untranslated", () => {
    expect(formatVersionLabel("1.4.0", { isProduction: true, developmentLabel: "utveckling" })).toBe(
      "Pong Ladder v1.4.0"
    );
  });
});

describe("hasUnseenRelease", () => {
  it("flags a deployed version newer than the one the viewer has seen", () => {
    expect(hasUnseenRelease("1.4.0", "1.3.0")).toBe(true);
  });

  it("stays quiet once the viewer has seen the current release", () => {
    expect(hasUnseenRelease("1.4.0", "1.4.0")).toBe(false);
  });

  it("stays quiet for a first-time viewer rather than nagging them", () => {
    expect(hasUnseenRelease("1.4.0", null)).toBe(false);
  });

  it("stays quiet when the stored value is unusable", () => {
    expect(hasUnseenRelease("1.4.0", "")).toBe(false);
    expect(hasUnseenRelease("1.4.0", "tampered")).toBe(false);
  });

  it("stays quiet when the viewer has somehow seen a newer release", () => {
    expect(hasUnseenRelease("1.4.0", "1.5.0")).toBe(false);
  });
});
