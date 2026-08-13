"use server";

import {
  MembershipAuditAction,
  MembershipJoinMethod,
  MembershipRole,
  MembershipStatus,
  OrganizationJoinPolicy,
  Prisma
} from "@prisma/client";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { openPlayerChallengeWhere } from "@/lib/admin-cleanup";
import { requireOrganizationAdmin } from "@/lib/authz";
import {
  assertCanChangeRole,
  assertCanManageMembership,
  assertCanTransferOwnership,
  MembershipAdministrationError
} from "@/lib/membership-administration";
import { organizationPath, organizationsPath } from "@/lib/organization-paths";
import { prisma } from "@/lib/prisma";

const idSchema = z.string().min(1);
const slugSchema = z.string().trim().min(1).max(100).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
const roleSchema = z.nativeEnum(MembershipRole);

export type MembershipAdminState = {
  error?: string;
  success?: string;
};

function value(formData: FormData, key: string) {
  return formData.get(key)?.toString() ?? "";
}

function refreshMembershipPages(organizationSlug: string) {
  revalidatePath(organizationsPath);
  revalidatePath(organizationPath(organizationSlug, "admin"));
  revalidatePath(organizationPath(organizationSlug, "ladder"));
  revalidatePath(organizationPath(organizationSlug, "players"));
  revalidatePath(organizationPath(organizationSlug, "matches"));
  revalidatePath(organizationPath(organizationSlug, "challenges"));
  revalidatePath(organizationPath(organizationSlug, "teams"));
  revalidatePath(organizationPath(organizationSlug, "account"));
}

async function requireAdmin(formData: FormData) {
  const slug = slugSchema.parse(value(formData, "organizationSlug"));
  return requireOrganizationAdmin(slug, organizationPath(slug, "admin"));
}

async function getActorMembership(tx: Prisma.TransactionClient, organizationId: string, actorUserId: string) {
  const actor = await tx.membership.findUnique({
    where: { userId_organizationId: { userId: actorUserId, organizationId } },
    select: { id: true, userId: true, role: true, status: true }
  });

  if (
    !actor ||
    actor.status !== MembershipStatus.ACTIVE ||
    (actor.role !== MembershipRole.ADMIN && actor.role !== MembershipRole.OWNER)
  ) {
    throw new MembershipAdministrationError("Organization administrator access required.");
  }

  return actor;
}

async function getTargetMembership(tx: Prisma.TransactionClient, organizationId: string, targetUserId: string) {
  const membership = await tx.membership.findUnique({
    where: { userId_organizationId: { userId: targetUserId, organizationId } },
    select: { id: true, userId: true, role: true, status: true }
  });

  if (!membership) {
    throw new MembershipAdministrationError("That organization membership no longer exists.");
  }

  return membership;
}

async function audit(
  tx: Prisma.TransactionClient,
  input: {
    organizationId: string;
    membershipId: string;
    subjectUserId: string;
    actorUserId: string;
    action: MembershipAuditAction;
    fromStatus?: MembershipStatus;
    toStatus?: MembershipStatus;
    fromRole?: MembershipRole;
    toRole?: MembershipRole;
  }
) {
  await tx.membershipAuditEvent.create({ data: input });
}

export async function approveOrganizationMembership(formData: FormData) {
  const { organization, session } = await requireAdmin(formData);
  const targetUserId = idSchema.parse(value(formData, "userId"));

  if (organization.joinPolicy !== OrganizationJoinPolicy.ADMIN_APPROVAL) {
    throw new MembershipAdministrationError("This organization does not use administrator approval.");
  }

  await prisma.$transaction(async (tx) => {
    const actor = await getActorMembership(tx, organization.id, session.sub);
    const target = await getTargetMembership(tx, organization.id, targetUserId);
    assertCanManageMembership(actor.role, target.role);

    if (target.status !== MembershipStatus.PENDING) {
      throw new MembershipAdministrationError("Only pending memberships can be approved.");
    }
    const previousStatus = target.status;

    await tx.membership.update({
      where: { id: target.id },
      data: {
        status: MembershipStatus.ACTIVE,
        activatedAt: new Date(),
        reviewedAt: new Date(),
        reviewedById: actor.userId
      }
    });
    await audit(tx, {
      organizationId: organization.id,
      membershipId: target.id,
      subjectUserId: target.userId,
      actorUserId: actor.userId,
      action: MembershipAuditAction.APPROVED,
      fromStatus: previousStatus,
      toStatus: MembershipStatus.ACTIVE
    });
  });

  refreshMembershipPages(organization.slug);
}

export async function rejectOrganizationMembership(formData: FormData) {
  const { organization, session } = await requireAdmin(formData);
  const targetUserId = idSchema.parse(value(formData, "userId"));

  if (organization.joinPolicy !== OrganizationJoinPolicy.ADMIN_APPROVAL) {
    throw new MembershipAdministrationError("This organization does not use administrator approval.");
  }

  await prisma.$transaction(async (tx) => {
    const actor = await getActorMembership(tx, organization.id, session.sub);
    const target = await getTargetMembership(tx, organization.id, targetUserId);
    assertCanManageMembership(actor.role, target.role);

    if (target.status !== MembershipStatus.PENDING) {
      throw new MembershipAdministrationError("Only pending memberships can be rejected.");
    }
    const previousStatus = target.status;

    await tx.membership.update({
      where: { id: target.id },
      data: { status: MembershipStatus.REJECTED, reviewedAt: new Date(), reviewedById: actor.userId }
    });
    await audit(tx, {
      organizationId: organization.id,
      membershipId: target.id,
      subjectUserId: target.userId,
      actorUserId: actor.userId,
      action: MembershipAuditAction.REJECTED,
      fromStatus: previousStatus,
      toStatus: MembershipStatus.REJECTED
    });
  });

  refreshMembershipPages(organization.slug);
}

export async function suspendOrganizationMembership(formData: FormData) {
  await setInactiveMembership(formData, MembershipStatus.SUSPENDED, MembershipAuditAction.SUSPENDED);
}

export async function removeOrganizationMembership(formData: FormData) {
  await setInactiveMembership(formData, MembershipStatus.REMOVED, MembershipAuditAction.REMOVED);
}

async function setInactiveMembership(
  formData: FormData,
  nextStatus: MembershipStatus,
  action: MembershipAuditAction
) {
  const { organization, session } = await requireAdmin(formData);
  const targetUserId = idSchema.parse(value(formData, "userId"));

  await prisma.$transaction(async (tx) => {
    const actor = await getActorMembership(tx, organization.id, session.sub);
    const target = await getTargetMembership(tx, organization.id, targetUserId);
    assertCanManageMembership(actor.role, target.role);

    if (target.status !== MembershipStatus.ACTIVE) {
      throw new MembershipAdministrationError("Only active memberships can be suspended or removed.");
    }
    const previousStatus = target.status;

    await tx.challenge.deleteMany({
      where: { organizationId: organization.id, ...openPlayerChallengeWhere(target.userId) }
    });
    await tx.membership.update({
      where: { id: target.id },
      data: { status: nextStatus, teamId: nextStatus === MembershipStatus.REMOVED ? null : undefined }
    });
    await audit(tx, {
      organizationId: organization.id,
      membershipId: target.id,
      subjectUserId: target.userId,
      actorUserId: actor.userId,
      action,
      fromStatus: previousStatus,
      toStatus: nextStatus
    });
  });

  refreshMembershipPages(organization.slug);
}

export async function reactivateOrganizationMembership(formData: FormData) {
  const { organization, session } = await requireAdmin(formData);
  const targetUserId = idSchema.parse(value(formData, "userId"));

  await prisma.$transaction(async (tx) => {
    const actor = await getActorMembership(tx, organization.id, session.sub);
    const target = await getTargetMembership(tx, organization.id, targetUserId);
    assertCanManageMembership(actor.role, target.role);

    if (
      target.status !== MembershipStatus.SUSPENDED &&
      target.status !== MembershipStatus.REJECTED &&
      target.status !== MembershipStatus.REMOVED
    ) {
      throw new MembershipAdministrationError("Only suspended, rejected, or removed memberships can be reactivated.");
    }
    const previousStatus = target.status;

    await tx.membership.update({
      where: { id: target.id },
      data: {
        status: MembershipStatus.ACTIVE,
        activatedAt: new Date(),
        reviewedAt: new Date(),
        reviewedById: actor.userId
      }
    });
    await audit(tx, {
      organizationId: organization.id,
      membershipId: target.id,
      subjectUserId: target.userId,
      actorUserId: actor.userId,
      action: MembershipAuditAction.REACTIVATED,
      fromStatus: previousStatus,
      toStatus: MembershipStatus.ACTIVE
    });
  });

  refreshMembershipPages(organization.slug);
}

export async function changeOrganizationMembershipRole(formData: FormData) {
  const { organization, session } = await requireAdmin(formData);
  const targetUserId = idSchema.parse(value(formData, "userId"));
  const nextRole = roleSchema.parse(value(formData, "role"));

  await prisma.$transaction(async (tx) => {
    const actor = await getActorMembership(tx, organization.id, session.sub);
    const target = await getTargetMembership(tx, organization.id, targetUserId);
    assertCanChangeRole(actor.role, target.role, nextRole);

    if (target.status !== MembershipStatus.ACTIVE || target.role === nextRole) {
      throw new MembershipAdministrationError("Choose an active member and a different role.");
    }
    const previousRole = target.role;

    await tx.membership.update({ where: { id: target.id }, data: { role: nextRole } });
    await audit(tx, {
      organizationId: organization.id,
      membershipId: target.id,
      subjectUserId: target.userId,
      actorUserId: actor.userId,
      action: MembershipAuditAction.ROLE_CHANGED,
      fromRole: previousRole,
      toRole: nextRole
    });
  });

  refreshMembershipPages(organization.slug);
}

export async function transferOrganizationOwnership(formData: FormData) {
  const { organization, session } = await requireAdmin(formData);
  const targetUserId = idSchema.parse(value(formData, "userId"));

  await prisma.$transaction(async (tx) => {
    const actor = await getActorMembership(tx, organization.id, session.sub);
    const target = await getTargetMembership(tx, organization.id, targetUserId);
    assertCanTransferOwnership(actor.userId, actor.role, target.userId, target.role, target.status);
    const targetPreviousRole = target.role;

    await tx.membership.update({ where: { id: actor.id }, data: { role: MembershipRole.ADMIN } });
    await tx.membership.update({ where: { id: target.id }, data: { role: MembershipRole.OWNER } });
    await audit(tx, {
      organizationId: organization.id,
      membershipId: actor.id,
      subjectUserId: actor.userId,
      actorUserId: actor.userId,
      action: MembershipAuditAction.OWNERSHIP_TRANSFERRED,
      fromRole: MembershipRole.OWNER,
      toRole: MembershipRole.ADMIN
    });
    await audit(tx, {
      organizationId: organization.id,
      membershipId: target.id,
      subjectUserId: target.userId,
      actorUserId: actor.userId,
      action: MembershipAuditAction.OWNERSHIP_TRANSFERRED,
      fromRole: targetPreviousRole,
      toRole: MembershipRole.OWNER
    });
  });

  refreshMembershipPages(organization.slug);
}

export async function addExistingOrganizationMember(
  _state: MembershipAdminState,
  formData: FormData
): Promise<MembershipAdminState> {
  const { organization, session } = await requireAdmin(formData);
  const targetUserId = idSchema.safeParse(value(formData, "userId"));

  if (!targetUserId.success) {
    return { error: "Select a verified account to add." };
  }

  try {
    const user = await prisma.$transaction(async (tx) => {
      const actor = await getActorMembership(tx, organization.id, session.sub);
      const user = await tx.user.findFirst({
        where: {
          id: targetUserId.data,
          emailVerifiedAt: { not: null },
          memberships: { none: { organizationId: organization.id } }
        },
        select: { id: true, username: true }
      });

      if (!user) {
        throw new MembershipAdministrationError("That verified account is already a member or no longer available.");
      }

      const membership = await tx.membership.create({
        data: {
          userId: user.id,
          organizationId: organization.id,
          role: MembershipRole.PLAYER,
          status: MembershipStatus.ACTIVE,
          joinMethod: MembershipJoinMethod.ADMIN_CREATED,
          activatedAt: new Date(),
          reviewedAt: new Date(),
          reviewedById: actor.userId
        }
      });
      await audit(tx, {
        organizationId: organization.id,
        membershipId: membership.id,
        subjectUserId: user.id,
        actorUserId: actor.userId,
        action: MembershipAuditAction.MEMBER_ADDED,
        toStatus: MembershipStatus.ACTIVE,
        toRole: MembershipRole.PLAYER
      });

      return user;
    });

    refreshMembershipPages(organization.slug);
    return { success: `${user.username} was added to ${organization.name}.` };
  } catch (error) {
    if (error instanceof MembershipAdministrationError) {
      return { error: error.message };
    }

    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return { error: "That account is already a member." };
    }

    throw error;
  }
}
