import { MembershipJoinMethod, MembershipStatus, OrganizationJoinPolicy } from "@prisma/client";
import { emailMatchesDomains } from "@/lib/organization-domain";

export type JoinPolicyDecision =
  | { allowed: true; status: MembershipStatus; joinMethod: MembershipJoinMethod }
  | { allowed: false; outcome: "invitation_required" | "domain_not_allowed" | "access_code_required" };

export function evaluateOrganizationJoinPolicy(input: {
  policy: OrganizationJoinPolicy;
  verifiedEmail: string;
  allowedEmailDomains: string[];
  invitationAccepted?: boolean;
}): JoinPolicyDecision {
  switch (input.policy) {
    case OrganizationJoinPolicy.OPEN:
      return { allowed: true, status: MembershipStatus.ACTIVE, joinMethod: MembershipJoinMethod.OPEN_JOIN };
    case OrganizationJoinPolicy.ADMIN_APPROVAL:
      return { allowed: true, status: MembershipStatus.PENDING, joinMethod: MembershipJoinMethod.ADMIN_REQUEST };
    case OrganizationJoinPolicy.INVITE_ONLY:
      return input.invitationAccepted
        ? { allowed: true, status: MembershipStatus.ACTIVE, joinMethod: MembershipJoinMethod.INVITATION }
        : { allowed: false, outcome: "invitation_required" };
    case OrganizationJoinPolicy.EMAIL_DOMAIN:
      return emailMatchesDomains(input.verifiedEmail, input.allowedEmailDomains)
        ? { allowed: true, status: MembershipStatus.ACTIVE, joinMethod: MembershipJoinMethod.EMAIL_DOMAIN }
        : { allowed: false, outcome: "domain_not_allowed" };
    case OrganizationJoinPolicy.ACCESS_CODE:
      return { allowed: false, outcome: "access_code_required" };
  }
}
