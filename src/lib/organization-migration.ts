import { MembershipRole } from "@prisma/client";

export type LegacyUserForMembership = {
  id: string;
  isAdmin: boolean;
  createdAt: Date;
};

export function selectInitialOwnerId(users: LegacyUserForMembership[]) {
  return [...users].sort(
    (left, right) =>
      Number(right.isAdmin) - Number(left.isAdmin) ||
      left.createdAt.getTime() - right.createdAt.getTime() ||
      left.id.localeCompare(right.id)
  )[0]?.id;
}

export function legacyMembershipRole(user: LegacyUserForMembership, ownerId?: string) {
  if (user.id === ownerId) {
    return MembershipRole.OWNER;
  }

  return user.isAdmin ? MembershipRole.ADMIN : MembershipRole.PLAYER;
}
