import { afterEach, describe, expect, it } from "vitest";
import {
  canCreateOrganizations,
  isReservedOrganizationSlug,
  normalizeOrganizationSlug
} from "@/lib/organization-creation-policy";

const originalEnabled = process.env.ORGANIZATION_CREATION_ENABLED;
const originalAllowlist = process.env.ORGANIZATION_CREATOR_EMAILS;

afterEach(() => {
  process.env.ORGANIZATION_CREATION_ENABLED = originalEnabled;
  process.env.ORGANIZATION_CREATOR_EMAILS = originalAllowlist;
});

describe("organization creation policy", () => {
  it("normalizes human input into stable URL slugs", () => {
    expect(normalizeOrganizationSlug("  Stockholms Pingisförening  ")).toBe("stockholms-pingisforening");
    expect(normalizeOrganizationSlug("Team---Blue")).toBe("team-blue");
  });

  it("reserves application routes", () => {
    expect(isReservedOrganizationSlug("admin")).toBe(true);
    expect(isReservedOrganizationSlug("join")).toBe(true);
    expect(isReservedOrganizationSlug("stockholm-club")).toBe(false);
  });

  it("requires the global feature flag or an exact verified-email allowlist match", () => {
    process.env.ORGANIZATION_CREATION_ENABLED = "false";
    process.env.ORGANIZATION_CREATOR_EMAILS = "owner@example.com, second@example.com";
    expect(canCreateOrganizations("OWNER@example.com")).toBe(true);
    expect(canCreateOrganizations("other@example.com")).toBe(false);

    process.env.ORGANIZATION_CREATION_ENABLED = "true";
    expect(canCreateOrganizations("other@example.com")).toBe(true);
  });
});
