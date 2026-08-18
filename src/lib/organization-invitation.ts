import { createHash, randomBytes } from "node:crypto";
import {
  MembershipAuditAction,
  MembershipJoinMethod,
  MembershipRole,
  MembershipStatus,
  Prisma
} from "@prisma/client";
import { prisma } from "@/lib/prisma";

export const ORGANIZATION_INVITATION_TOKEN_BYTES = 32;
export const ORGANIZATION_INVITATION_TOKEN_LENGTH = 43;

const invitationTokenPattern = /^[A-Za-z0-9_-]{43}$/;

export type InvitationAvailability = "valid" | "invalid" | "expired" | "revoked" | "exhausted";

export type InvitationInspection =
  | { availability: "invalid" }
  | {
      availability: Exclude<InvitationAvailability, "invalid">;
      id: string;
      organization: { id: string; name: string; slug: string };
      expiresAt: Date;
    };

export type InvitationRedemptionResult =
  | { outcome: "redeemed" | "already_member"; organizationName: string; organizationSlug: string }
  | {
      outcome: "invalid" | "expired" | "revoked" | "exhausted" | "verification_required";
      organizationName?: string;
    }
  | {
      outcome: "pending" | "rejected" | "suspended" | "removed";
      organizationName: string;
    };

export function generateOrganizationInvitationToken() {
  return randomBytes(ORGANIZATION_INVITATION_TOKEN_BYTES).toString("base64url");
}

export function isOrganizationInvitationToken(token: string) {
  return invitationTokenPattern.test(token);
}

export function hashOrganizationInvitationToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export function getInvitationAvailability(
  invitation: { revokedAt: Date | null; expiresAt: Date; maxUses: number | null; useCount: number },
  now = new Date()
): Exclude<InvitationAvailability, "invalid"> {
  if (invitation.revokedAt) {
    return "revoked";
  }

  if (invitation.expiresAt <= now) {
    return "expired";
  }

  if (invitation.maxUses !== null && invitation.useCount >= invitation.maxUses) {
    return "exhausted";
  }

  return "valid";
}

export async function inspectOrganizationInvitation(token: string, now = new Date()): Promise<InvitationInspection> {
  if (!isOrganizationInvitationToken(token)) {
    return { availability: "invalid" };
  }

  const invitation = await prisma.organizationInvitation.findUnique({
    where: { tokenHash: hashOrganizationInvitationToken(token) },
    select: {
      id: true,
      expiresAt: true,
      maxUses: true,
      useCount: true,
      revokedAt: true,
      organization: { select: { id: true, name: true, slug: true } }
    }
  });

  if (!invitation) {
    return { availability: "invalid" };
  }

  return {
    availability: getInvitationAvailability(invitation, now),
    id: invitation.id,
    organization: invitation.organization,
    expiresAt: invitation.expiresAt
  };
}

export async function hasActiveOrganizationMembership(userId: string, organizationId: string) {
  const membership = await prisma.membership.findUnique({
    where: { userId_organizationId: { userId, organizationId } },
    select: { status: true }
  });

  return membership?.status === MembershipStatus.ACTIVE;
}

export async function redeemOrganizationInvitation(
  token: string,
  userId: string,
  now = new Date()
): Promise<InvitationRedemptionResult> {
  if (!isOrganizationInvitationToken(token)) {
    return { outcome: "invalid" };
  }

  return redeemInvitation({ tokenHash: hashOrganizationInvitationToken(token) }, userId, now);
}

export async function redeemOrganizationInvitationById(
  invitationId: string,
  userId: string,
  now = new Date()
): Promise<InvitationRedemptionResult> {
  if (!invitationId) {
    return { outcome: "invalid" };
  }

  return redeemInvitation({ id: invitationId }, userId, now);
}

async function redeemInvitation(
  where: Prisma.OrganizationInvitationWhereUniqueInput,
  userId: string,
  now: Date
): Promise<InvitationRedemptionResult> {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      return await prisma.$transaction(
        async (tx) => redeemInTransaction(tx, where, userId, now),
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
      );
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2034" && attempt < 2) {
        continue;
      }

      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        const membership = await prisma.membership.findFirst({
          where: { userId, organization: { invitations: { some: where } } },
          select: { status: true, organization: { select: { name: true, slug: true } } }
        });

        if (membership?.status === MembershipStatus.ACTIVE) {
          return {
            outcome: "already_member",
            organizationName: membership.organization.name,
            organizationSlug: membership.organization.slug
          };
        }
      }

      throw error;
    }
  }

  return { outcome: "invalid" };
}

async function redeemInTransaction(
  tx: Prisma.TransactionClient,
  where: Prisma.OrganizationInvitationWhereUniqueInput,
  userId: string,
  now: Date
): Promise<InvitationRedemptionResult> {
  const [user, invitation] = await Promise.all([
    tx.user.findUnique({ where: { id: userId }, select: { emailVerifiedAt: true } }),
    tx.organizationInvitation.findUnique({
      where,
      select: {
        id: true,
        organizationId: true,
        creatorMembership: { select: { userId: true } },
        expiresAt: true,
        maxUses: true,
        useCount: true,
        revokedAt: true,
        organization: { select: { name: true, slug: true } }
      }
    })
  ]);

  if (!user?.emailVerifiedAt) {
    return { outcome: "verification_required" };
  }

  if (!invitation) {
    return { outcome: "invalid" };
  }

  const existing = await tx.membership.findUnique({
    where: { userId_organizationId: { userId, organizationId: invitation.organizationId } },
    select: { id: true, status: true, role: true }
  });

  // Settled membership wins over invitation availability: a replayed callback must
  // finish cleanly instead of reporting the invitation this user already consumed.
  if (existing?.status === MembershipStatus.ACTIVE) {
    return {
      outcome: "already_member",
      organizationName: invitation.organization.name,
      organizationSlug: invitation.organization.slug
    };
  }

  const availability = getInvitationAvailability(invitation, now);

  if (availability !== "valid") {
    return {
      outcome: availability,
      organizationName: invitation.organization.name
    };
  }

  if (
    existing?.status === MembershipStatus.REJECTED ||
    existing?.status === MembershipStatus.SUSPENDED ||
    existing?.status === MembershipStatus.REMOVED
  ) {
    return {
      outcome: existing.status.toLowerCase() as "rejected" | "suspended" | "removed",
      organizationName: invitation.organization.name
    };
  }

  const claimed = await tx.$queryRaw<Array<{ id: string }>>(Prisma.sql`
    UPDATE "OrganizationInvitation"
    SET "useCount" = "useCount" + 1, "updatedAt" = ${now}
    WHERE "id" = ${invitation.id}
      AND "revokedAt" IS NULL
      AND "expiresAt" > ${now}
      AND ("maxUses" IS NULL OR "useCount" < "maxUses")
    RETURNING "id"
  `);

  if (claimed.length !== 1) {
    const concurrentMembership = await tx.membership.findUnique({
      where: { userId_organizationId: { userId, organizationId: invitation.organizationId } },
      select: { status: true }
    });

    if (concurrentMembership?.status === MembershipStatus.ACTIVE) {
      return {
        outcome: "already_member",
        organizationName: invitation.organization.name,
        organizationSlug: invitation.organization.slug
      };
    }

    return { outcome: "exhausted", organizationName: invitation.organization.name };
  }

  const membership = existing
    ? await tx.membership.update({
        where: { id: existing.id },
        data: {
          status: MembershipStatus.ACTIVE,
          role: existing.role,
          joinMethod: MembershipJoinMethod.INVITATION,
          activatedAt: now,
          reviewedAt: now,
          reviewedById: invitation.creatorMembership?.userId ?? null
        }
      })
    : await tx.membership.create({
        data: {
          userId,
          organizationId: invitation.organizationId,
          role: MembershipRole.PLAYER,
          status: MembershipStatus.ACTIVE,
          joinMethod: MembershipJoinMethod.INVITATION,
          activatedAt: now,
          reviewedAt: now,
          reviewedById: invitation.creatorMembership?.userId ?? null
        }
      });

  await tx.invitationRedemption.create({
    data: {
      invitationId: invitation.id,
      organizationId: invitation.organizationId,
      userId
    }
  });
  await tx.membershipAuditEvent.create({
    data: {
      organizationId: invitation.organizationId,
      membershipId: membership.id,
      subjectUserId: userId,
      actorUserId: invitation.creatorMembership?.userId ?? null,
      action: MembershipAuditAction.MEMBER_ADDED,
      fromStatus: existing?.status,
      toStatus: MembershipStatus.ACTIVE,
      fromRole: existing?.role,
      toRole: membership.role
    }
  });

  return {
    outcome: "redeemed",
    organizationName: invitation.organization.name,
    organizationSlug: invitation.organization.slug
  };
}
