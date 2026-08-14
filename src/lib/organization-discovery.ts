import { MembershipStatus, OrganizationJoinPolicy } from "@prisma/client";

export const discoverableOrganizationJoinPolicies: OrganizationJoinPolicy[] = [
  OrganizationJoinPolicy.OPEN,
  OrganizationJoinPolicy.ADMIN_APPROVAL,
  OrganizationJoinPolicy.EMAIL_DOMAIN
];

export function canDisplayPendingOrganization(joinPolicy: OrganizationJoinPolicy) {
  return discoverableOrganizationJoinPolicies.includes(joinPolicy);
}

export function canDisplayUnavailableOrganization(input: {
  status: MembershipStatus;
  activatedAt: Date | null;
  joinPolicy: OrganizationJoinPolicy;
}) {
  if (input.status === MembershipStatus.REMOVED) {
    return false;
  }

  return input.activatedAt !== null || discoverableOrganizationJoinPolicies.includes(input.joinPolicy);
}
