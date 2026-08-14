import { MembershipStatus, OrganizationJoinPolicy } from "@prisma/client";
import { describe, expect, it } from "vitest";
import {
  canDisplayPendingOrganization,
  canDisplayUnavailableOrganization,
  discoverableOrganizationJoinPolicies
} from "@/lib/organization-discovery";

describe("organization discovery", () => {
  it("does not discover access-code or invitation-only organizations", () => {
    expect(discoverableOrganizationJoinPolicies).toEqual([
      OrganizationJoinPolicy.OPEN,
      OrganizationJoinPolicy.ADMIN_APPROVAL,
      OrganizationJoinPolicy.EMAIL_DOMAIN
    ]);
    expect(discoverableOrganizationJoinPolicies).not.toContain(OrganizationJoinPolicy.ACCESS_CODE);
    expect(discoverableOrganizationJoinPolicies).not.toContain(OrganizationJoinPolicy.INVITE_ONLY);
  });

  it("does not reveal a hidden organization through an old pending request", () => {
    expect(canDisplayPendingOrganization(OrganizationJoinPolicy.ACCESS_CODE)).toBe(false);
    expect(canDisplayPendingOrganization(OrganizationJoinPolicy.INVITE_ONLY)).toBe(false);
  });

  it("shows a suspended status only when the user previously had active access", () => {
    expect(
      canDisplayUnavailableOrganization({
        status: MembershipStatus.SUSPENDED,
        activatedAt: new Date(),
        joinPolicy: OrganizationJoinPolicy.ACCESS_CODE
      })
    ).toBe(true);
    expect(
      canDisplayUnavailableOrganization({
        status: MembershipStatus.REJECTED,
        activatedAt: null,
        joinPolicy: OrganizationJoinPolicy.ACCESS_CODE
      })
    ).toBe(false);
  });

  it("never reveals removed memberships", () => {
    expect(
      canDisplayUnavailableOrganization({
        status: MembershipStatus.REMOVED,
        activatedAt: new Date(),
        joinPolicy: OrganizationJoinPolicy.ACCESS_CODE
      })
    ).toBe(false);
  });
});
