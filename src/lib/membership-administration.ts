import { MembershipRole, MembershipStatus } from "@prisma/client";

export class MembershipAdministrationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "MembershipAdministrationError";
  }
}

export function assertCanManageMembership(actorRole: MembershipRole, targetRole: MembershipRole) {
  if (actorRole !== MembershipRole.ADMIN && actorRole !== MembershipRole.OWNER) {
    throw new MembershipAdministrationError("Organization administrator access required.");
  }

  if (targetRole === MembershipRole.OWNER) {
    throw new MembershipAdministrationError("Transfer ownership before changing this owner's membership.");
  }

  if (targetRole === MembershipRole.ADMIN && actorRole !== MembershipRole.OWNER) {
    throw new MembershipAdministrationError("Only an organization owner can manage administrators.");
  }
}

export function assertCanChangeRole(actorRole: MembershipRole, targetRole: MembershipRole, nextRole: MembershipRole) {
  if (actorRole !== MembershipRole.OWNER) {
    throw new MembershipAdministrationError("Only an organization owner can change member roles.");
  }

  if (targetRole === MembershipRole.OWNER || nextRole === MembershipRole.OWNER) {
    throw new MembershipAdministrationError("Use ownership transfer to change the organization owner.");
  }

  if (nextRole !== MembershipRole.ADMIN && nextRole !== MembershipRole.PLAYER) {
    throw new MembershipAdministrationError("Choose the player or administrator role.");
  }
}

export function assertCanTransferOwnership(
  actorUserId: string,
  actorRole: MembershipRole,
  targetUserId: string,
  targetRole: MembershipRole,
  targetStatus: MembershipStatus
) {
  if (actorRole !== MembershipRole.OWNER) {
    throw new MembershipAdministrationError("Only an organization owner can transfer ownership.");
  }

  if (actorUserId === targetUserId) {
    throw new MembershipAdministrationError("Choose another active member as the new owner.");
  }

  if (targetStatus !== MembershipStatus.ACTIVE || targetRole === MembershipRole.OWNER) {
    throw new MembershipAdministrationError("Ownership can only be transferred to another active member.");
  }
}

export function canManageMembership(actorRole: MembershipRole, targetRole: MembershipRole) {
  try {
    assertCanManageMembership(actorRole, targetRole);
    return true;
  } catch {
    return false;
  }
}
