import { MembershipRole, MembershipStatus } from "@prisma/client";
import { describe, expect, it } from "vitest";
import {
  assertCanChangeRole,
  assertCanManageMembership,
  assertCanTransferOwnership,
  canManageMembership
} from "@/lib/membership-administration";

describe("membership administration permissions", () => {
  it("lets administrators manage players but not other administrators", () => {
    expect(() => assertCanManageMembership(MembershipRole.ADMIN, MembershipRole.PLAYER)).not.toThrow();
    expect(() => assertCanManageMembership(MembershipRole.ADMIN, MembershipRole.ADMIN)).toThrow(
      "Only an organization owner"
    );
    expect(canManageMembership(MembershipRole.ADMIN, MembershipRole.OWNER)).toBe(false);
  });

  it("protects owners from suspension, removal, and ordinary role changes", () => {
    expect(() => assertCanManageMembership(MembershipRole.OWNER, MembershipRole.OWNER)).toThrow(
      "Transfer ownership"
    );
    expect(() =>
      assertCanChangeRole(MembershipRole.OWNER, MembershipRole.OWNER, MembershipRole.ADMIN)
    ).toThrow("ownership transfer");
  });

  it("allows only owners to grant or revoke administrator access", () => {
    expect(() =>
      assertCanChangeRole(MembershipRole.ADMIN, MembershipRole.PLAYER, MembershipRole.ADMIN)
    ).toThrow("Only an organization owner");
    expect(() =>
      assertCanChangeRole(MembershipRole.OWNER, MembershipRole.PLAYER, MembershipRole.ADMIN)
    ).not.toThrow();
    expect(() =>
      assertCanChangeRole(MembershipRole.OWNER, MembershipRole.ADMIN, MembershipRole.PLAYER)
    ).not.toThrow();
  });

  it("transfers ownership only to another active member", () => {
    expect(() =>
      assertCanTransferOwnership(
        "owner",
        MembershipRole.OWNER,
        "player",
        MembershipRole.PLAYER,
        MembershipStatus.ACTIVE
      )
    ).not.toThrow();
    expect(() =>
      assertCanTransferOwnership(
        "owner",
        MembershipRole.OWNER,
        "player",
        MembershipRole.PLAYER,
        MembershipStatus.SUSPENDED
      )
    ).toThrow("active member");
    expect(() =>
      assertCanTransferOwnership(
        "owner",
        MembershipRole.OWNER,
        "owner",
        MembershipRole.OWNER,
        MembershipStatus.ACTIVE
      )
    ).toThrow("another active member");
  });
});
