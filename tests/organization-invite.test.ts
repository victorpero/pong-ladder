import { MembershipRole } from "@prisma/client";
import { describe, expect, it } from "vitest";
import { canRotateOrganizationInvite, createOrganizationCodeInvitationUrl } from "@/lib/organization-invite";

describe("organization invite hub", () => {
  it("shows rotation controls only to owners and administrators", () => {
    expect(canRotateOrganizationInvite(MembershipRole.OWNER)).toBe(true);
    expect(canRotateOrganizationInvite(MembershipRole.ADMIN)).toBe(true);
    expect(canRotateOrganizationInvite(MembershipRole.PLAYER)).toBe(false);
  });

  it("builds a reusable same-origin invitation link from the organization code", () => {
    expect(createOrganizationCodeInvitationUrl("https://pong.example/path", "2345-6789-ABCD")).toBe(
      "https://pong.example/join/code#code=2345-6789-ABCD"
    );
  });
});
