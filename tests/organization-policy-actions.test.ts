import {
  OrganizationAuditAction,
  OrganizationJoinPolicy,
  OrganizationType,
  OrganizationVisibility
} from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { hashOrganizationAccessCode } from "@/lib/organization-access-code";
import { decryptOrganizationCredential } from "@/lib/organization-credential";

const state = vi.hoisted(() => ({
  owner: true,
  organization: {
    id: "org-1",
    slug: "example",
    name: "Example",
    type: "WORKPLACE" as OrganizationType,
    visibility: "PRIVATE" as OrganizationVisibility,
    joinPolicy: "ADMIN_APPROVAL" as OrganizationJoinPolicy,
    allowedEmailDomains: [] as string[],
    accessCodeHash: null as string | null,
    accessCodeCiphertext: null as string | null,
    accessCodeEnabled: false,
    accessCodeUpdatedAt: null as Date | null
  },
  auditActions: [] as string[]
}));

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/authz", () => ({
  requireOrganizationAdmin: async () => {
    if (!state.owner) {
      throw new Error("NOT_FOUND");
    }

    return { organization: state.organization, membership: { id: "membership-owner" } };
  },
  requireOrganizationOwner: async () => {
    if (!state.owner) {
      throw new Error("NOT_FOUND");
    }

    return { organization: state.organization, membership: { id: "membership-owner" } };
  }
}));
vi.mock("@/lib/prisma", () => {
  const db = {
    organization: {
      update: async ({ data }: { data: Partial<typeof state.organization> }) => {
        Object.assign(state.organization, data);
        return state.organization;
      }
    },
    organizationAuditEvent: {
      create: async ({ data }: { data: { action: string } }) => {
        state.auditActions.push(data.action);
        return data;
      }
    }
  };

  return { prisma: { ...db, $transaction: async (run: (tx: unknown) => Promise<unknown>) => run(db) } };
});

const {
  disableOrganizationAccessCode,
  rotateOrganizationAccessCode,
  updateOrganizationDetails,
  updateOrganizationJoinPolicy
} = await import("@/lib/organization-policy-actions");

function policyForm(policy: OrganizationJoinPolicy, domains = "") {
  const formData = new FormData();
  formData.set("organizationSlug", "example");
  formData.set("joinPolicy", policy);
  formData.set("allowedEmailDomains", domains);
  return formData;
}

function codeForm() {
  const formData = new FormData();
  formData.set("organizationSlug", "example");
  return formData;
}

beforeEach(() => {
  process.env.ORGANIZATION_ACCESS_CODE_SECRET = "organization-code-test-secret";
  process.env.ORGANIZATION_CREDENTIAL_SECRET = "organization-credential-test-secret";
  state.owner = true;
  state.auditActions = [];
  Object.assign(state.organization, {
    joinPolicy: OrganizationJoinPolicy.ADMIN_APPROVAL,
    name: "Example",
    type: OrganizationType.WORKPLACE,
    visibility: OrganizationVisibility.PRIVATE,
    allowedEmailDomains: [],
    accessCodeHash: null,
    accessCodeCiphertext: null,
    accessCodeEnabled: false,
    accessCodeUpdatedAt: null
  });
});

describe("organization join-policy administration", () => {
  it("allows only owners to change a policy", async () => {
    state.owner = false;

    await expect(updateOrganizationJoinPolicy({}, policyForm(OrganizationJoinPolicy.OPEN))).rejects.toThrow(
      "NOT_FOUND"
    );
  });

  it("normalizes exact domains and requires one for domain-based joining", async () => {
    await expect(
      updateOrganizationJoinPolicy({}, policyForm(OrganizationJoinPolicy.EMAIL_DOMAIN, "Example.com, team.example.com"))
    ).resolves.toEqual({ success: "Join policy updated." });
    expect(state.organization).toMatchObject({
      joinPolicy: OrganizationJoinPolicy.EMAIL_DOMAIN,
      allowedEmailDomains: ["example.com", "team.example.com"]
    });

    await expect(
      updateOrganizationJoinPolicy({}, policyForm(OrganizationJoinPolicy.EMAIL_DOMAIN, "invalid"))
    ).resolves.toMatchObject({ error: expect.stringContaining("valid email domain") });
  });

  it("stores a hash and encrypted recoverable value without returning the raw code", async () => {
    await rotateOrganizationAccessCode({}, codeForm());
    const accessCode = decryptOrganizationCredential(state.organization.accessCodeCiphertext!);

    expect(accessCode).toMatch(/^[23456789ABCDEFGHJKLMNPQRSTUVWXYZ]{4}(?:-[23456789ABCDEFGHJKLMNPQRSTUVWXYZ]{4}){2}$/);
    expect(state.organization.accessCodeHash).toBe(hashOrganizationAccessCode(accessCode));
    expect(state.organization.accessCodeHash).not.toContain(accessCode);
    expect(state.organization.accessCodeEnabled).toBe(true);
    expect(state.organization.accessCodeUpdatedAt).toBeInstanceOf(Date);
    expect(state.auditActions).toContain(OrganizationAuditAction.ACCESS_CODE_GENERATED);
  });

  it("rotates and disables a code without retaining a usable old value", async () => {
    await rotateOrganizationAccessCode({}, codeForm());
    const firstCode = decryptOrganizationCredential(state.organization.accessCodeCiphertext!);
    const firstHash = state.organization.accessCodeHash;
    await rotateOrganizationAccessCode({}, codeForm());
    const secondCode = decryptOrganizationCredential(state.organization.accessCodeCiphertext!);

    expect(secondCode).not.toBe(firstCode);
    expect(state.organization.accessCodeHash).not.toBe(firstHash);
    expect(state.auditActions).toContain(OrganizationAuditAction.ACCESS_CODE_ROTATED);

    await expect(disableOrganizationAccessCode({}, codeForm())).resolves.toEqual({
      success: "The organization code was disabled."
    });
    expect(state.organization).toMatchObject({
      accessCodeHash: null,
      accessCodeCiphertext: null,
      accessCodeEnabled: false
    });
    expect(state.auditActions).toContain(OrganizationAuditAction.ACCESS_CODE_DISABLED);
  });

  it("updates general settings without changing the immutable slug", async () => {
    const formData = new FormData();
    formData.set("organizationSlug", "example");
    formData.set("name", "Renamed Club");
    formData.set("type", OrganizationType.SPORTS_CLUB);
    formData.set("visibility", OrganizationVisibility.DISCOVERABLE);

    await expect(updateOrganizationDetails({}, formData)).resolves.toEqual({
      success: "Organization settings updated."
    });
    expect(state.organization).toMatchObject({
      slug: "example",
      name: "Renamed Club",
      type: OrganizationType.SPORTS_CLUB,
      visibility: OrganizationVisibility.DISCOVERABLE
    });
    expect(state.auditActions).toContain(OrganizationAuditAction.SETTINGS_UPDATED);
  });

  it("keeps the member invite code active when the discovery policy changes", async () => {
    await rotateOrganizationAccessCode({}, codeForm());
    await updateOrganizationJoinPolicy({}, policyForm(OrganizationJoinPolicy.OPEN));

    expect(state.organization.accessCodeEnabled).toBe(true);
  });
});
