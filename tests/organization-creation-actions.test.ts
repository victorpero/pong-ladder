import {
  MembershipJoinMethod,
  MembershipRole,
  MembershipStatus,
  OrganizationAuditAction,
  OrganizationJoinPolicy,
  OrganizationType,
  OrganizationVisibility,
  Prisma
} from "@prisma/client";
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";

const originalCreationFlag = process.env.ORGANIZATION_CREATION_ENABLED;
const originalCreatorAllowlist = process.env.ORGANIZATION_CREATOR_EMAILS;
const originalAccessCodeSecret = process.env.ORGANIZATION_ACCESS_CODE_SECRET;
const originalCredentialSecret = process.env.ORGANIZATION_CREDENTIAL_SECRET;

type OrganizationRow = {
  id: string;
  slug: string;
  name: string;
  type: OrganizationType;
  joinPolicy: OrganizationJoinPolicy;
  visibility: OrganizationVisibility;
  allowedEmailDomains: string[];
  accessCodeHash: string;
  accessCodeCiphertext: string;
  accessCodeEnabled: boolean;
  accessCodeUpdatedAt: Date;
};

const state = vi.hoisted(() => ({
  user: { id: "creator", email: "creator@example.com", emailVerifiedAt: new Date() as Date | null },
  organizations: [] as OrganizationRow[],
  memberships: [] as Array<Record<string, unknown>>,
  audits: [] as Array<Record<string, unknown>>,
  failMembershipCreation: false
}));

vi.mock("next/headers", () => ({
  cookies: () => ({
    get: (name: string) => ({ value: name === "pong-ladder-locale" ? "en" : "session-token" })
  }),
  headers: () => new Headers()
}));
vi.mock("next/navigation", () => ({
  redirect: (path: string) => {
    throw new Error(`REDIRECT:${path}`);
  }
}));
vi.mock("@/lib/authz", () => ({
  verifyEmailPath: (locale: string) => `/${locale}/verify-email`,
  requireAuthenticatedUser: async () => ({ user: state.user })
}));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    $transaction: async (run: (tx: unknown) => Promise<unknown>) => {
      const organizations = structuredClone(state.organizations);
      const memberships = structuredClone(state.memberships);
      const audits = structuredClone(state.audits);
      const tx = {
        organization: {
          create: async ({ data }: { data: Omit<OrganizationRow, "id"> }) => {
            if (organizations.some((organization) => organization.slug === data.slug)) {
              throw new Prisma.PrismaClientKnownRequestError("Unique constraint failed", {
                code: "P2002",
                clientVersion: "5.22.0"
              });
            }

            const created = { id: `org-${organizations.length + 1}`, ...data };
            organizations.push(created);
            return created;
          }
        },
        membership: {
          create: async ({ data }: { data: Record<string, unknown> }) => {
            if (state.failMembershipCreation) {
              throw new Error("membership failed");
            }

            const created = { id: `membership-${memberships.length + 1}`, ...data };
            memberships.push(created);
            return created;
          }
        },
        organizationAuditEvent: {
          create: async ({ data }: { data: Record<string, unknown> }) => {
            audits.push(data);
            return data;
          }
        }
      };

      const result = await run(tx);
      state.organizations = organizations;
      state.memberships = memberships;
      state.audits = audits;
      return result;
    }
  }
}));

const { createOrganization } = await import("@/lib/organization-creation-actions");

beforeEach(() => {
  process.env.ORGANIZATION_CREATION_ENABLED = "true";
  process.env.ORGANIZATION_CREATOR_EMAILS = "";
  process.env.ORGANIZATION_ACCESS_CODE_SECRET = "organization-code-creation-test-secret";
  process.env.ORGANIZATION_CREDENTIAL_SECRET = "organization-credential-creation-test-secret";
  state.user = { id: "creator", email: "creator@example.com", emailVerifiedAt: new Date() };
  state.organizations = [];
  state.memberships = [];
  state.audits = [];
  state.failMembershipCreation = false;
});

afterAll(() => {
  process.env.ORGANIZATION_CREATION_ENABLED = originalCreationFlag;
  process.env.ORGANIZATION_CREATOR_EMAILS = originalCreatorAllowlist;
  process.env.ORGANIZATION_ACCESS_CODE_SECRET = originalAccessCodeSecret;
  process.env.ORGANIZATION_CREDENTIAL_SECRET = originalCredentialSecret;
});

describe("organization creation", () => {
  it("stores the chosen default language and falls back to Swedish", async () => {
    await expect(createOrganization({}, form("English Club", "English Club", "en"))).rejects.toThrow(
      "REDIRECT:/en/organizations?created=english-club"
    );
    expect(state.organizations[0]).toMatchObject({ slug: "english-club", defaultLocale: "en" });

    state.organizations = [];
    await expect(createOrganization({}, form("Svenska Klubben", "Svenska Klubben"))).rejects.toThrow(
      "REDIRECT:/en/organizations?created=svenska-klubben"
    );
    expect(state.organizations[0]).toMatchObject({ slug: "svenska-klubben", defaultLocale: "sv" });
  });

  it("creates the organization and active owner membership atomically", async () => {
    await expect(createOrganization({}, form("Stockholm Club", "Stockholm Club"))).rejects.toThrow(
      "REDIRECT:/en/organizations?created=stockholm-club"
    );

    expect(state.organizations).toContainEqual(
      expect.objectContaining({
        slug: "stockholm-club",
        name: "Stockholm Club",
        accessCodeEnabled: true,
        accessCodeHash: expect.any(String),
        accessCodeCiphertext: expect.any(String),
        accessCodeUpdatedAt: expect.any(Date)
      })
    );
    expect(state.memberships).toContainEqual(
      expect.objectContaining({
        userId: "creator",
        organizationId: state.organizations[0].id,
        role: MembershipRole.OWNER,
        status: MembershipStatus.ACTIVE,
        joinMethod: MembershipJoinMethod.ADMIN_CREATED
      })
    );
    expect(state.audits).toContainEqual(
      expect.objectContaining({ action: OrganizationAuditAction.ORGANIZATION_CREATED })
    );
  });

  it("rolls back organization creation if owner membership creation fails", async () => {
    state.failMembershipCreation = true;

    await expect(createOrganization({}, form("Rollback Club", "rollback-club"))).rejects.toThrow("membership failed");
    expect(state.organizations).toHaveLength(0);
    expect(state.memberships).toHaveLength(0);
    expect(state.audits).toHaveLength(0);
  });

  it("rejects duplicate and reserved normalized slugs", async () => {
    state.organizations.push({
      id: "existing",
      slug: "stockholm-club",
      name: "Existing",
      type: OrganizationType.OTHER,
      joinPolicy: OrganizationJoinPolicy.INVITE_ONLY,
      visibility: OrganizationVisibility.PRIVATE,
      allowedEmailDomains: [],
      accessCodeHash: "existing-hash",
      accessCodeCiphertext: "existing-ciphertext",
      accessCodeEnabled: true,
      accessCodeUpdatedAt: new Date()
    });

    await expect(createOrganization({}, form("Duplicate", "Stockholm Club"))).resolves.toEqual({
      error: "That URL slug is already in use."
    });
    await expect(createOrganization({}, form("Reserved", "admin"))).resolves.toEqual({
      error: "Choose a different URL slug."
    });
  });

  it("enforces the creation feature gate", async () => {
    process.env.ORGANIZATION_CREATION_ENABLED = "false";

    await expect(createOrganization({}, form("Blocked", "blocked"))).resolves.toEqual({
      error: "Organization creation is not enabled for this account."
    });
    expect(state.organizations).toHaveLength(0);
  });
});

function form(name: string, slug: string, defaultLocale?: string) {
  const formData = new FormData();
  formData.set("name", name);
  formData.set("slug", slug);
  formData.set("type", OrganizationType.SPORTS_CLUB);
  formData.set("joinPolicy", OrganizationJoinPolicy.INVITE_ONLY);
  formData.set("visibility", OrganizationVisibility.PRIVATE);
  formData.set("allowedEmailDomains", "");

  if (defaultLocale !== undefined) {
    formData.set("defaultLocale", defaultLocale);
  }

  return formData;
}
