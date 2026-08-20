import { MembershipRole, MembershipStatus } from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  signedIn: true,
  verified: true,
  membership: null as null | {
    id: string;
    role: MembershipRole;
    status: MembershipStatus;
    organization: { id: string; slug: string; name: string };
  }
}));

const findFirst = vi.hoisted(() => vi.fn());

vi.mock("@/lib/auth", () => ({
  auth: {
    api: {
      getSession: async () =>
        state.signedIn
          ? {
              user: { id: "user-1" },
              session: { createdAt: new Date("2026-01-01"), expiresAt: new Date("2027-01-01") }
            }
          : null
    }
  }
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findUnique: async () => ({
        id: "user-1",
        username: "player",
        email: "player@example.com",
        emailVerifiedAt: state.verified ? new Date("2026-01-01") : null
      })
    },
    membership: { findFirst }
  }
}));

vi.mock("next/headers", () => ({
  cookies: () => ({
    get: (name: string) => ({ value: name === "pong-ladder-locale" ? "en" : "session-token" })
  }),
  headers: () => new Headers()
}));
vi.mock("next/navigation", () => ({
  redirect: (path: string) => {
    throw new Error(`REDIRECT:${path}`);
  },
  notFound: () => {
    throw new Error("NOT_FOUND");
  }
}));

const { requireOrganizationAdmin, requireOrganizationOwner, requireOrganizationUser } = await import("@/lib/authz");

beforeEach(() => {
  state.signedIn = true;
  state.verified = true;
  state.membership = {
    id: "membership-1",
    role: MembershipRole.PLAYER,
    status: MembershipStatus.ACTIVE,
    organization: { id: "org-1", slug: "polisen", name: "Polisen" }
  };
  findFirst.mockReset().mockImplementation(async () => state.membership);
});

describe("organization route context", () => {
  it("resolves an active membership by both user and organization slug", async () => {
    await expect(requireOrganizationUser("polisen")).resolves.toMatchObject({
      organization: { id: "org-1", slug: "polisen" },
      membership: { id: "membership-1" }
    });
    expect(findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          userId: "user-1",
          status: MembershipStatus.ACTIVE,
          organization: { slug: "polisen" }
        }
      })
    );
  });

  it("uses the same safe response for unknown and unauthorized slugs", async () => {
    state.membership = null;

    await expect(requireOrganizationUser("unknown")).rejects.toThrow("NOT_FOUND");
    await expect(requireOrganizationUser("private-org")).rejects.toThrow("NOT_FOUND");
  });

  it("preserves the scoped destination and language while requiring email verification", async () => {
    state.verified = false;

    await expect(requireOrganizationUser("polisen", "/en/org/polisen/matches")).rejects.toThrow(
      "REDIRECT:/en/verify-email?next=%2Fen%2Forg%2Fpolisen%2Fmatches"
    );
  });

  it("defaults the destination to the organization ladder in the active language", async () => {
    state.verified = false;

    await expect(requireOrganizationUser("polisen")).rejects.toThrow(
      "REDIRECT:/en/verify-email?next=%2Fen%2Forg%2Fpolisen%2Fladder"
    );
  });

  it("allows only administrators and owners into organization administration", async () => {
    await expect(requireOrganizationAdmin("polisen")).rejects.toThrow("NOT_FOUND");

    state.membership = { ...state.membership!, role: MembershipRole.ADMIN };
    await expect(requireOrganizationAdmin("polisen")).resolves.toMatchObject({
      membership: { role: MembershipRole.ADMIN }
    });
  });

  it("reserves join-policy and code lifecycle changes for owners", async () => {
    state.membership = { ...state.membership!, role: MembershipRole.ADMIN };
    await expect(requireOrganizationOwner("polisen")).rejects.toThrow("NOT_FOUND");

    state.membership = { ...state.membership!, role: MembershipRole.OWNER };
    await expect(requireOrganizationOwner("polisen")).resolves.toMatchObject({
      membership: { role: MembershipRole.OWNER }
    });
  });
});
