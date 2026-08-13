import { OrganizationJoinPolicy } from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { hashOrganizationAccessCode } from "@/lib/organization-access-code";

const state = vi.hoisted(() => ({
  owner: true,
  organization: {
    id: "org-1",
    slug: "example",
    joinPolicy: "ADMIN_APPROVAL" as OrganizationJoinPolicy,
    allowedEmailDomains: [] as string[],
    accessCodeHash: null as string | null,
    accessCodeEnabled: false,
    accessCodeUpdatedAt: null as Date | null
  }
}));

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/authz", () => ({
  requireOrganizationOwner: async () => {
    if (!state.owner) {
      throw new Error("NOT_FOUND");
    }

    return { organization: state.organization };
  }
}));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    organization: {
      update: async ({ data }: { data: Partial<typeof state.organization> }) => {
        Object.assign(state.organization, data);
        return state.organization;
      }
    }
  }
}));

const { disableOrganizationAccessCode, rotateOrganizationAccessCode, updateOrganizationJoinPolicy } = await import(
  "@/lib/organization-policy-actions"
);

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
  state.owner = true;
  Object.assign(state.organization, {
    joinPolicy: OrganizationJoinPolicy.ADMIN_APPROVAL,
    allowedEmailDomains: [],
    accessCodeHash: null,
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

  it("returns a raw code once while storing only its hash", async () => {
    const result = await rotateOrganizationAccessCode({}, codeForm());

    expect(result.accessCode).toMatch(/^[23456789ABCDEFGHJKLMNPQRSTUVWXYZ]{4}(?:-[23456789ABCDEFGHJKLMNPQRSTUVWXYZ]{4}){2}$/);
    expect(state.organization.accessCodeHash).toBe(hashOrganizationAccessCode(result.accessCode!));
    expect(state.organization.accessCodeHash).not.toContain(result.accessCode!);
    expect(state.organization.accessCodeEnabled).toBe(true);
    expect(state.organization.accessCodeUpdatedAt).toBeInstanceOf(Date);
  });

  it("rotates and disables a code without retaining a usable old value", async () => {
    const first = await rotateOrganizationAccessCode({}, codeForm());
    const firstHash = state.organization.accessCodeHash;
    const second = await rotateOrganizationAccessCode({}, codeForm());

    expect(second.accessCode).not.toBe(first.accessCode);
    expect(state.organization.accessCodeHash).not.toBe(firstHash);

    await expect(disableOrganizationAccessCode({}, codeForm())).resolves.toEqual({
      success: "The organization code was disabled."
    });
    expect(state.organization).toMatchObject({ accessCodeHash: null, accessCodeEnabled: false });
  });

  it("disables code use when switching away from the access-code policy", async () => {
    await rotateOrganizationAccessCode({}, codeForm());
    await updateOrganizationJoinPolicy({}, policyForm(OrganizationJoinPolicy.OPEN));

    expect(state.organization.accessCodeEnabled).toBe(false);
  });
});
