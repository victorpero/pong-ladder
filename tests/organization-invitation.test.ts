import { describe, expect, it } from "vitest";
import {
  generateOrganizationInvitationToken,
  getInvitationAvailability,
  hashOrganizationInvitationToken,
  isOrganizationInvitationToken,
  ORGANIZATION_INVITATION_TOKEN_LENGTH
} from "@/lib/organization-invitation";

describe("organization invitation credentials", () => {
  it("generates opaque high-entropy tokens and stores a one-way hash", () => {
    const first = generateOrganizationInvitationToken();
    const second = generateOrganizationInvitationToken();

    expect(first).toHaveLength(ORGANIZATION_INVITATION_TOKEN_LENGTH);
    expect(isOrganizationInvitationToken(first)).toBe(true);
    expect(second).not.toBe(first);
    expect(hashOrganizationInvitationToken(first)).toMatch(/^[a-f0-9]{64}$/);
    expect(hashOrganizationInvitationToken(first)).not.toContain(first);
  });

  it("rejects malformed and sequential-looking invitation credentials", () => {
    expect(isOrganizationInvitationToken("12345")).toBe(false);
    expect(isOrganizationInvitationToken("1".repeat(43))).toBe(true);
    expect(isOrganizationInvitationToken("a".repeat(42) + "/")).toBe(false);
  });

  it("distinguishes active, expired, revoked, and exhausted invitations", () => {
    const now = new Date("2026-08-13T12:00:00Z");
    const active = {
      revokedAt: null,
      expiresAt: new Date("2026-08-14T12:00:00Z"),
      maxUses: 2,
      useCount: 1
    };

    expect(getInvitationAvailability(active, now)).toBe("valid");
    expect(getInvitationAvailability({ ...active, expiresAt: now }, now)).toBe("expired");
    expect(getInvitationAvailability({ ...active, revokedAt: new Date() }, now)).toBe("revoked");
    expect(getInvitationAvailability({ ...active, useCount: 2 }, now)).toBe("exhausted");
    expect(getInvitationAvailability({ ...active, maxUses: null, useCount: 500 }, now)).toBe("valid");
  });
});
