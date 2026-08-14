import { MembershipRole } from "@prisma/client";
import { describe, expect, it } from "vitest";
import { legacyMembershipRole, selectInitialOwnerId } from "@/lib/organization-migration";

describe("Polisen membership migration", () => {
  const createdAt = new Date("2026-01-01T00:00:00.000Z");

  it("selects the oldest administrator as the initial owner", () => {
    const users = [
      { id: "player", isAdmin: false, createdAt: new Date("2025-01-01T00:00:00.000Z") },
      { id: "new-admin", isAdmin: true, createdAt: new Date("2026-02-01T00:00:00.000Z") },
      { id: "old-admin", isAdmin: true, createdAt }
    ];

    expect(selectInitialOwnerId(users)).toBe("old-admin");
  });

  it("falls back to the oldest user when no administrator exists", () => {
    expect(
      selectInitialOwnerId([
        { id: "later", isAdmin: false, createdAt: new Date("2026-02-01T00:00:00.000Z") },
        { id: "earlier", isAdmin: false, createdAt }
      ])
    ).toBe("earlier");
  });

  it("preserves remaining administrator roles and makes all other users players", () => {
    expect(legacyMembershipRole({ id: "owner", isAdmin: true, createdAt }, "owner")).toBe(MembershipRole.OWNER);
    expect(legacyMembershipRole({ id: "admin", isAdmin: true, createdAt }, "owner")).toBe(MembershipRole.ADMIN);
    expect(legacyMembershipRole({ id: "player", isAdmin: false, createdAt }, "owner")).toBe(MembershipRole.PLAYER);
  });
});
