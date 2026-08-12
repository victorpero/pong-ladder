import { MembershipRole, MembershipStatus } from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  membership: null as null | { role: MembershipRole; status: MembershipStatus },
  emailVerifiedAt: new Date() as Date | null
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    membership: {
      findUnique: async () =>
        state.membership
          ? {
              id: "membership",
              userId: "user",
              organizationId: "org",
              organization: { id: "org" },
              user: { emailVerifiedAt: state.emailVerifiedAt },
              ...state.membership
            }
          : null
    }
  }
}));

vi.mock("next/headers", () => ({ headers: () => new Headers() }));
vi.mock("next/navigation", () => ({ redirect: vi.fn() }));

const { requireActiveMembership, requireOrgAdmin, requireOrgOwner } = await import("@/lib/authz");

beforeEach(() => {
  state.membership = null;
  state.emailVerifiedAt = new Date();
});

describe("organization authorization", () => {
  it.each([MembershipStatus.PENDING, MembershipStatus.SUSPENDED, MembershipStatus.REJECTED])(
    "rejects %s memberships",
    async (status) => {
      state.membership = { role: MembershipRole.PLAYER, status };
      await expect(requireActiveMembership("user", "org")).rejects.toThrow("Organization access required.");
    }
  );

  it("rejects users without a membership", async () => {
    await expect(requireActiveMembership("user", "org")).rejects.toThrow("Organization access required.");
  });

  it("rejects active memberships until the user's email is verified", async () => {
    state.membership = { role: MembershipRole.PLAYER, status: MembershipStatus.ACTIVE };
    state.emailVerifiedAt = null;
    await expect(requireActiveMembership("user", "org")).rejects.toThrow("Organization access required.");
  });

  it("allows active players into protected organization functionality", async () => {
    state.membership = { role: MembershipRole.PLAYER, status: MembershipStatus.ACTIVE };
    await expect(requireActiveMembership("user", "org")).resolves.toMatchObject({ role: MembershipRole.PLAYER });
  });

  it("keeps player, administrator, and owner privileges separate", async () => {
    state.membership = { role: MembershipRole.PLAYER, status: MembershipStatus.ACTIVE };
    await expect(requireOrgAdmin("user", "org")).rejects.toThrow("administrator access required");

    state.membership = { role: MembershipRole.ADMIN, status: MembershipStatus.ACTIVE };
    await expect(requireOrgAdmin("user", "org")).resolves.toMatchObject({ role: MembershipRole.ADMIN });
    await expect(requireOrgOwner("user", "org")).rejects.toThrow("owner access required");

    state.membership = { role: MembershipRole.OWNER, status: MembershipStatus.ACTIVE };
    await expect(requireOrgOwner("user", "org")).resolves.toMatchObject({ role: MembershipRole.OWNER });
  });
});
