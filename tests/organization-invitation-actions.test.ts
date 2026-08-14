import { MembershipRole, MembershipStatus } from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { hashOrganizationInvitationToken } from "@/lib/organization-invitation";

type InvitationRow = {
  id: string;
  organizationId: string;
  creatorMembershipId: string;
  tokenHash: string;
  expiresAt: Date;
  maxUses: number | null;
  revokedAt: Date | null;
};

const state = vi.hoisted(() => ({
  authorized: true,
  invitations: [] as InvitationRow[]
}));

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/app-url", () => ({ getAppBaseUrl: () => "https://pong.example" }));
vi.mock("@/lib/authz", () => ({
  getSessionUser: async () => null,
  requireOrganizationAdmin: async () => {
    if (!state.authorized) {
      throw new Error("NOT_FOUND");
    }

    return {
      organization: { id: "org-one", slug: "one", name: "One" },
      membership: {
        id: "membership-admin",
        userId: "admin",
        role: MembershipRole.ADMIN,
        status: MembershipStatus.ACTIVE
      }
    };
  }
}));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    organizationInvitation: {
      create: async ({ data }: { data: Omit<InvitationRow, "id" | "revokedAt"> }) => {
        const created = { id: `invitation-${state.invitations.length + 1}`, revokedAt: null, ...data };
        state.invitations.push(created);
        return created;
      },
      updateMany: async ({
        where,
        data
      }: {
        where: { id: string; organizationId: string; revokedAt: null };
        data: { revokedAt: Date };
      }) => {
        const invitation = state.invitations.find(
          (candidate) => candidate.id === where.id && candidate.organizationId === where.organizationId && !candidate.revokedAt
        );

        if (!invitation) {
          return { count: 0 };
        }

        invitation.revokedAt = data.revokedAt;
        return { count: 1 };
      }
    }
  }
}));

const { createOrganizationInvitation, revokeOrganizationInvitation } = await import(
  "@/lib/organization-invitation-actions"
);

beforeEach(() => {
  state.authorized = true;
  state.invitations = [];
});

describe("organization invitation administration", () => {
  it("allows an organization administrator to create a link while storing only its hash", async () => {
    const result = await createOrganizationInvitation({}, createForm("24", "1"));
    const token = result.invitationUrl?.split("/").at(-1);

    expect(result.invitationUrl).toMatch(/^https:\/\/pong\.example\/join\/[A-Za-z0-9_-]{43}$/);
    expect(state.invitations).toHaveLength(1);
    expect(state.invitations[0]).toMatchObject({
      organizationId: "org-one",
      creatorMembershipId: "membership-admin",
      maxUses: 1
    });
    expect(state.invitations[0].tokenHash).toBe(hashOrganizationInvitationToken(token!));
    expect(state.invitations[0].tokenHash).not.toContain(token!);
    expect(state.invitations[0].expiresAt.getTime()).toBeGreaterThan(Date.now());
  });

  it("supports an unlimited invitation", async () => {
    await createOrganizationInvitation({}, createForm("168", ""));
    expect(state.invitations[0].maxUses).toBeNull();
  });

  it("scopes revocation to the active organization", async () => {
    state.invitations = [
      invitation("one", "org-one"),
      invitation("two", "org-two")
    ];

    await revokeOrganizationInvitation(revokeForm("two"));
    expect(state.invitations[1].revokedAt).toBeNull();

    await revokeOrganizationInvitation(revokeForm("one"));
    expect(state.invitations[0].revokedAt).toBeInstanceOf(Date);
  });

  it("rejects non-admin management calls", async () => {
    state.authorized = false;

    await expect(createOrganizationInvitation({}, createForm("24", "1"))).rejects.toThrow("NOT_FOUND");
    await expect(revokeOrganizationInvitation(revokeForm("one"))).rejects.toThrow("NOT_FOUND");
    expect(state.invitations).toHaveLength(0);
  });
});

function createForm(expiresInHours: string, maxUses: string) {
  const formData = new FormData();
  formData.set("organizationSlug", "one");
  formData.set("expiresInHours", expiresInHours);
  formData.set("maxUses", maxUses);
  return formData;
}

function revokeForm(invitationId: string) {
  const formData = new FormData();
  formData.set("organizationSlug", "one");
  formData.set("invitationId", invitationId);
  return formData;
}

function invitation(id: string, organizationId: string): InvitationRow {
  return {
    id,
    organizationId,
    creatorMembershipId: "membership-admin",
    tokenHash: id.repeat(32).slice(0, 64),
    expiresAt: new Date(Date.now() + 60_000),
    maxUses: null,
    revokedAt: null
  };
}
