import {
  MembershipAuditAction,
  MembershipJoinMethod,
  MembershipRole,
  MembershipStatus
} from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { hashOrganizationInvitationToken } from "@/lib/organization-invitation";

type MembershipRow = {
  id: string;
  userId: string;
  organizationId: string;
  role: MembershipRole;
  status: MembershipStatus;
  joinMethod: MembershipJoinMethod;
};

type InvitationRow = {
  id: string;
  tokenHash: string;
  organizationId: string;
  expiresAt: Date;
  maxUses: number | null;
  useCount: number;
  revokedAt: Date | null;
  creatorMembership: { userId: string } | null;
  organization: { name: string; slug: string };
};

const state = vi.hoisted(() => ({
  users: new Map<string, Date | null>(),
  invitations: [] as InvitationRow[],
  memberships: [] as MembershipRow[],
  redemptions: [] as Array<{ invitationId: string; organizationId: string; userId: string }>,
  audits: [] as Array<Record<string, unknown>>,
  claimedInvitationId: "invite-one" as string
}));

vi.mock("@/lib/prisma", () => {
  const membership = {
    findUnique: async ({ where }: { where: { userId_organizationId: { userId: string; organizationId: string } } }) =>
      state.memberships.find(
        (row) =>
          row.userId === where.userId_organizationId.userId &&
          row.organizationId === where.userId_organizationId.organizationId
      ) ?? null,
    findFirst: async () => null,
    create: async ({ data }: { data: Omit<MembershipRow, "id"> }) => {
      const created = { id: `membership-${state.memberships.length + 1}`, ...data };
      state.memberships.push(created);
      return created;
    },
    update: async ({ where, data }: { where: { id: string }; data: Partial<MembershipRow> }) => {
      const row = state.memberships.find((candidate) => candidate.id === where.id)!;
      Object.assign(row, data);
      return row;
    }
  };
  const db = {
    user: {
      findUnique: async ({ where }: { where: { id: string } }) =>
        state.users.has(where.id) ? { emailVerifiedAt: state.users.get(where.id) } : null
    },
    organizationInvitation: {
      findUnique: async ({ where }: { where: { tokenHash: string } }) =>
        state.invitations.find((invitation) => invitation.tokenHash === where.tokenHash) ?? null
    },
    membership,
    invitationRedemption: {
      create: async ({ data }: { data: { invitationId: string; organizationId: string; userId: string } }) => {
        state.redemptions.push(data);
        return { id: `redemption-${state.redemptions.length}`, ...data };
      }
    },
    membershipAuditEvent: {
      create: async ({ data }: { data: Record<string, unknown> }) => {
        state.audits.push(data);
        return { id: `audit-${state.audits.length}`, ...data };
      }
    },
    $queryRaw: async () => {
      const invitation = state.invitations.find((candidate) => candidate.id === state.claimedInvitationId);
      const now = new Date("2026-08-13T12:00:00Z");

      if (
        !invitation ||
        invitation.revokedAt ||
        invitation.expiresAt <= now ||
        (invitation.maxUses !== null && invitation.useCount >= invitation.maxUses)
      ) {
        return [];
      }

      invitation.useCount += 1;
      return [{ id: invitation.id }];
    },
    $transaction: async (run: (tx: unknown) => Promise<unknown>) => run(db)
  };

  return { prisma: db };
});

const { redeemOrganizationInvitation } = await import("@/lib/organization-invitation");

const token = "A".repeat(43);
const now = new Date("2026-08-13T12:00:00Z");

beforeEach(() => {
  state.users = new Map([
    ["user-one", new Date("2026-01-01T00:00:00Z")],
    ["user-two", new Date("2026-01-01T00:00:00Z")],
    ["unverified", null]
  ]);
  state.invitations = [invitation()];
  state.memberships = [];
  state.redemptions = [];
  state.audits = [];
  state.claimedInvitationId = "invite-one";
});

describe("organization invitation redemption", () => {
  it("creates an active organization membership and an audit record", async () => {
    await expect(redeemOrganizationInvitation(token, "user-one", now)).resolves.toMatchObject({
      outcome: "redeemed",
      organizationName: "Private Club",
      organizationSlug: "private-club"
    });

    expect(state.memberships).toContainEqual(
      expect.objectContaining({
        userId: "user-one",
        organizationId: "org-one",
        role: MembershipRole.PLAYER,
        status: MembershipStatus.ACTIVE,
        joinMethod: MembershipJoinMethod.INVITATION
      })
    );
    expect(state.invitations[0].useCount).toBe(1);
    expect(state.redemptions).toEqual([
      { invitationId: "invite-one", organizationId: "org-one", userId: "user-one" }
    ]);
    expect(state.audits).toContainEqual(
      expect.objectContaining({
        action: MembershipAuditAction.MEMBER_ADDED,
        actorUserId: "admin-one",
        subjectUserId: "user-one"
      })
    );
  });

  it("activates a pending request without entering routine approval", async () => {
    state.memberships.push(membership("user-one", "org-one", MembershipStatus.PENDING));

    await expect(redeemOrganizationInvitation(token, "user-one", now)).resolves.toMatchObject({ outcome: "redeemed" });
    expect(state.memberships[0]).toMatchObject({
      status: MembershipStatus.ACTIVE,
      joinMethod: MembershipJoinMethod.INVITATION
    });
  });

  it("does not let invitations bypass suspended or removed access", async () => {
    state.memberships.push(membership("user-one", "org-one", MembershipStatus.SUSPENDED));
    await expect(redeemOrganizationInvitation(token, "user-one", now)).resolves.toMatchObject({ outcome: "suspended" });

    state.memberships[0].status = MembershipStatus.REMOVED;
    await expect(redeemOrganizationInvitation(token, "user-one", now)).resolves.toMatchObject({ outcome: "removed" });
    expect(state.invitations[0].useCount).toBe(0);
  });

  it("requires verified identity before consuming a use", async () => {
    await expect(redeemOrganizationInvitation(token, "unverified", now)).resolves.toEqual({
      outcome: "verification_required"
    });
    expect(state.memberships).toHaveLength(0);
    expect(state.invitations[0].useCount).toBe(0);
  });

  it("enforces a single-use limit without affecting another organization", async () => {
    state.invitations[0].maxUses = 1;
    state.memberships.push(membership("user-two", "org-two", MembershipStatus.ACTIVE));

    await expect(redeemOrganizationInvitation(token, "user-one", now)).resolves.toMatchObject({ outcome: "redeemed" });
    await expect(redeemOrganizationInvitation(token, "user-two", now)).resolves.toMatchObject({ outcome: "exhausted" });

    expect(state.memberships.find((row) => row.userId === "user-two")).toMatchObject({ organizationId: "org-two" });
    expect(state.memberships.filter((row) => row.organizationId === "org-one")).toHaveLength(1);
  });

  it("does not consume a use for an existing active member", async () => {
    state.memberships.push(membership("user-one", "org-one", MembershipStatus.ACTIVE));

    await expect(redeemOrganizationInvitation(token, "user-one", now)).resolves.toMatchObject({
      outcome: "already_member"
    });
    expect(state.invitations[0].useCount).toBe(0);
    expect(state.redemptions).toHaveLength(0);
  });

  it.each([
    ["expired", { expiresAt: now }],
    ["revoked", { revokedAt: new Date("2026-08-13T11:00:00Z") }],
    ["exhausted", { maxUses: 1, useCount: 1 }]
  ] as const)("rejects an %s invitation", async (outcome, overrides) => {
    Object.assign(state.invitations[0], overrides);

    await expect(redeemOrganizationInvitation(token, "user-one", now)).resolves.toMatchObject({ outcome });
    expect(state.memberships).toHaveLength(0);
  });
});

function invitation(overrides: Partial<InvitationRow> = {}): InvitationRow {
  return {
    id: "invite-one",
    tokenHash: hashOrganizationInvitationToken(token),
    organizationId: "org-one",
    expiresAt: new Date("2026-08-20T12:00:00Z"),
    maxUses: null,
    useCount: 0,
    revokedAt: null,
    creatorMembership: { userId: "admin-one" },
    organization: { name: "Private Club", slug: "private-club" },
    ...overrides
  };
}

function membership(userId: string, organizationId: string, status: MembershipStatus): MembershipRow {
  return {
    id: `${organizationId}-${userId}`,
    userId,
    organizationId,
    role: MembershipRole.PLAYER,
    status,
    joinMethod: MembershipJoinMethod.LEGACY
  };
}
