import { MembershipJoinMethod, MembershipStatus, OrganizationJoinPolicy } from "@prisma/client";
import { describe, expect, it } from "vitest";
import { evaluateOrganizationJoinPolicy } from "@/lib/organization-join-policy";

const baseInput = {
  verifiedEmail: "player@example.com",
  allowedEmailDomains: ["example.com"]
};

describe("organization join policies", () => {
  it("activates verified accounts for open organizations", () => {
    expect(evaluateOrganizationJoinPolicy({ ...baseInput, policy: OrganizationJoinPolicy.OPEN })).toEqual({
      allowed: true,
      status: MembershipStatus.ACTIVE,
      joinMethod: MembershipJoinMethod.OPEN_JOIN
    });
  });

  it("creates pending requests for administrator approval", () => {
    expect(evaluateOrganizationJoinPolicy({ ...baseInput, policy: OrganizationJoinPolicy.ADMIN_APPROVAL })).toEqual({
      allowed: true,
      status: MembershipStatus.PENDING,
      joinMethod: MembershipJoinMethod.ADMIN_REQUEST
    });
  });

  it("requires an invitation and activates a valid invitation", () => {
    expect(evaluateOrganizationJoinPolicy({ ...baseInput, policy: OrganizationJoinPolicy.INVITE_ONLY })).toEqual({
      allowed: false,
      outcome: "invitation_required"
    });
    expect(
      evaluateOrganizationJoinPolicy({
        ...baseInput,
        policy: OrganizationJoinPolicy.INVITE_ONLY,
        invitationAccepted: true
      })
    ).toEqual({
      allowed: true,
      status: MembershipStatus.ACTIVE,
      joinMethod: MembershipJoinMethod.INVITATION
    });
  });

  it("activates only exact allowed email domains", () => {
    expect(evaluateOrganizationJoinPolicy({ ...baseInput, policy: OrganizationJoinPolicy.EMAIL_DOMAIN })).toEqual({
      allowed: true,
      status: MembershipStatus.ACTIVE,
      joinMethod: MembershipJoinMethod.EMAIL_DOMAIN
    });
    expect(
      evaluateOrganizationJoinPolicy({
        ...baseInput,
        verifiedEmail: "player@sub.example.com",
        policy: OrganizationJoinPolicy.EMAIL_DOMAIN
      })
    ).toEqual({ allowed: false, outcome: "domain_not_allowed" });
  });

  it("routes access-code organizations through code verification", () => {
    expect(evaluateOrganizationJoinPolicy({ ...baseInput, policy: OrganizationJoinPolicy.ACCESS_CODE })).toEqual({
      allowed: false,
      outcome: "access_code_required"
    });
  });
});
