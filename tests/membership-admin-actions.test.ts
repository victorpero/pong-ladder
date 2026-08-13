import {
  MembershipAuditAction,
  MembershipJoinMethod,
  MembershipRole,
  MembershipStatus,
  OrganizationJoinPolicy
} from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";

type MembershipRow = {
  id: string;
  userId: string;
  organizationId: string;
  role: MembershipRole;
  status: MembershipStatus;
  joinMethod: MembershipJoinMethod;
  teamId: string | null;
};

const state = vi.hoisted(() => ({
  actorUserId: "owner" as string,
  joinPolicy: "ADMIN_APPROVAL" as OrganizationJoinPolicy,
  memberships: [] as MembershipRow[],
  audits: [] as Array<Record<string, unknown>>,
  challengeCleanupOrganizations: [] as string[]
}));

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

vi.mock("@/lib/authz", () => ({
  requireOrganizationAdmin: async () => {
    const actor = state.memberships.find(
      (membership) => membership.organizationId === "org-one" && membership.userId === state.actorUserId
    );

    if (
      !actor ||
      actor.status !== MembershipStatus.ACTIVE ||
      (actor.role !== MembershipRole.ADMIN && actor.role !== MembershipRole.OWNER)
    ) {
      throw new Error("Organization administrator access required.");
    }

    return {
      session: { sub: actor.userId },
      membership: actor,
      organization: {
        id: "org-one",
        slug: "one",
        name: "One",
        joinPolicy: state.joinPolicy
      }
    };
  }
}));

vi.mock("@/lib/prisma", () => {
  const db = {
    membership: {
      findUnique: async ({ where }: { where: { userId_organizationId: { userId: string; organizationId: string } } }) =>
        state.memberships.find(
          (membership) =>
            membership.userId === where.userId_organizationId.userId &&
            membership.organizationId === where.userId_organizationId.organizationId
        ) ?? null,
      update: async ({ where, data }: { where: { id: string }; data: Partial<MembershipRow> }) => {
        const membership = state.memberships.find((candidate) => candidate.id === where.id);

        if (!membership) {
          throw new Error("Missing membership");
        }

        Object.assign(membership, data);
        return membership;
      }
    },
    membershipAuditEvent: {
      create: async ({ data }: { data: Record<string, unknown> }) => {
        state.audits.push(data);
        return { id: `audit-${state.audits.length}`, ...data };
      }
    },
    challenge: {
      deleteMany: async ({ where }: { where: { organizationId: string } }) => {
        state.challengeCleanupOrganizations.push(where.organizationId);
        return { count: 1 };
      }
    },
    $transaction: async (run: (tx: unknown) => Promise<unknown>) => run(db)
  };

  return { prisma: db };
});

const {
  approveOrganizationMembership,
  suspendOrganizationMembership,
  transferOrganizationOwnership
} = await import("@/lib/membership-admin-actions");

function form(userId: string) {
  const formData = new FormData();
  formData.set("organizationSlug", "one");
  formData.set("userId", userId);
  return formData;
}

beforeEach(() => {
  state.actorUserId = "owner";
  state.joinPolicy = OrganizationJoinPolicy.ADMIN_APPROVAL;
  state.audits = [];
  state.challengeCleanupOrganizations = [];
  state.memberships = [
    membership("owner", "org-one", MembershipRole.OWNER),
    membership("admin", "org-one", MembershipRole.ADMIN),
    membership("player", "org-one", MembershipRole.PLAYER),
    membership("outsider", "org-two", MembershipRole.PLAYER),
    membership("pending", "org-one", MembershipRole.PLAYER, MembershipStatus.PENDING)
  ];
});

describe("membership administration actions", () => {
  it("suspends a player only inside the selected organization and records the change", async () => {
    state.actorUserId = "admin";

    await suspendOrganizationMembership(form("player"));

    expect(findMembership("player", "org-one").status).toBe(MembershipStatus.SUSPENDED);
    expect(findMembership("outsider", "org-two").status).toBe(MembershipStatus.ACTIVE);
    expect(state.challengeCleanupOrganizations).toEqual(["org-one"]);
    expect(state.audits).toContainEqual(
      expect.objectContaining({
        organizationId: "org-one",
        subjectUserId: "player",
        actorUserId: "admin",
        action: MembershipAuditAction.SUSPENDED,
        fromStatus: MembershipStatus.ACTIVE,
        toStatus: MembershipStatus.SUSPENDED
      })
    );
  });

  it("does not let an administrator suspend another administrator", async () => {
    state.actorUserId = "admin";

    await expect(suspendOrganizationMembership(form("owner"))).rejects.toThrow("Transfer ownership");
    expect(findMembership("owner", "org-one").status).toBe(MembershipStatus.ACTIVE);
    expect(state.audits).toHaveLength(0);
  });

  it("cannot mutate a membership from another organization", async () => {
    await expect(suspendOrganizationMembership(form("outsider"))).rejects.toThrow("no longer exists");
    expect(findMembership("outsider", "org-two").status).toBe(MembershipStatus.ACTIVE);
  });

  it("transfers ownership atomically and leaves an active owner", async () => {
    await transferOrganizationOwnership(form("player"));

    expect(findMembership("owner", "org-one").role).toBe(MembershipRole.ADMIN);
    expect(findMembership("player", "org-one").role).toBe(MembershipRole.OWNER);
    expect(
      state.memberships.filter(
        (candidate) =>
          candidate.organizationId === "org-one" &&
          candidate.status === MembershipStatus.ACTIVE &&
          candidate.role === MembershipRole.OWNER
      )
    ).toHaveLength(1);
    expect(state.audits.filter((event) => event.action === MembershipAuditAction.OWNERSHIP_TRANSFERRED)).toHaveLength(2);
  });

  it("approves requests only for the administrator-approval policy", async () => {
    state.actorUserId = "admin";
    state.joinPolicy = OrganizationJoinPolicy.ACCESS_CODE;

    await expect(approveOrganizationMembership(form("pending"))).rejects.toThrow(
      "does not use administrator approval"
    );
    expect(findMembership("pending", "org-one").status).toBe(MembershipStatus.PENDING);

    state.joinPolicy = OrganizationJoinPolicy.ADMIN_APPROVAL;
    await approveOrganizationMembership(form("pending"));

    expect(findMembership("pending", "org-one").status).toBe(MembershipStatus.ACTIVE);
    expect(state.audits.at(-1)).toEqual(
      expect.objectContaining({ action: MembershipAuditAction.APPROVED, actorUserId: "admin" })
    );
  });
});

function membership(
  userId: string,
  organizationId: string,
  role: MembershipRole,
  status: MembershipStatus = MembershipStatus.ACTIVE
): MembershipRow {
  return {
    id: `${organizationId}-${userId}`,
    userId,
    organizationId,
    role,
    status,
    joinMethod: MembershipJoinMethod.LEGACY,
    teamId: null
  };
}

function findMembership(userId: string, organizationId: string) {
  const row = state.memberships.find(
    (candidate) => candidate.userId === userId && candidate.organizationId === organizationId
  );

  if (!row) {
    throw new Error("Missing test membership");
  }

  return row;
}
