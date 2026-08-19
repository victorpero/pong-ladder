import { MembershipRole, MembershipStatus } from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  locale: "sv",
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
      getSession: async () => ({
        user: { id: "user-1" },
        session: { createdAt: new Date("2026-01-01"), expiresAt: new Date("2027-01-01") }
      })
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
        emailVerifiedAt: new Date("2026-01-01")
      })
    },
    membership: { findFirst }
  }
}));

vi.mock("next/headers", () => ({
  cookies: () => ({
    get: (name: string) => ({ value: name === "pong-ladder-locale" ? state.locale : "session-token" })
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

const { requireOrganizationUser } = await import("@/lib/authz");

beforeEach(() => {
  state.locale = "sv";
  state.membership = {
    id: "membership-1",
    role: MembershipRole.PLAYER,
    status: MembershipStatus.ACTIVE,
    organization: { id: "org-1", slug: "polisen", name: "Polisen" }
  };
  findFirst.mockReset().mockImplementation(async () => state.membership);
});

describe("tenant isolation is independent of language", () => {
  it("asks the same authorization question in every language", async () => {
    await requireOrganizationUser("polisen");
    const swedishQuery = findFirst.mock.calls[0][0];

    findFirst.mockClear();
    state.locale = "en";
    await requireOrganizationUser("polisen");

    expect(findFirst.mock.calls[0][0]).toEqual(swedishQuery);
    expect(swedishQuery).toMatchObject({
      where: { userId: "user-1", status: MembershipStatus.ACTIVE, organization: { slug: "polisen" } }
    });
  });

  it("refuses an organization the account cannot open, whichever language is active", async () => {
    state.membership = null;

    await expect(requireOrganizationUser("other-tenant")).rejects.toThrow("NOT_FOUND");

    state.locale = "en";
    await expect(requireOrganizationUser("other-tenant")).rejects.toThrow("NOT_FOUND");
  });

  it("keeps a language choice from changing which organization is opened", async () => {
    await expect(requireOrganizationUser("polisen")).resolves.toMatchObject({
      organization: { id: "org-1", slug: "polisen" }
    });

    state.locale = "en";
    await expect(requireOrganizationUser("polisen")).resolves.toMatchObject({
      organization: { id: "org-1", slug: "polisen" }
    });
  });
});
