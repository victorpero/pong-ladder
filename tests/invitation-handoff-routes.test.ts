import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PENDING_INVITATION_COOKIE, readPendingInvitation, signPendingInvitation } from "@/lib/pending-invitation";

type SessionUser = { user: { id: string; email: string; emailVerifiedAt: Date | null } } | null;

const state = vi.hoisted(() => ({
  sessionUser: null as SessionUser,
  inspection: { availability: "valid", id: "invitation-1" } as Record<string, unknown>,
  redemption: { outcome: "redeemed", organizationName: "Polisen", organizationSlug: "polisen" } as Record<
    string,
    unknown
  >,
  requestCookie: undefined as string | undefined,
  writtenCookies: [] as Array<{ name: string; value: string }>
}));

vi.mock("@/lib/authz", () => ({
  getSessionUser: vi.fn(() => Promise.resolve(state.sessionUser)),
  verifyEmailPath: "/verify-email"
}));

vi.mock("@/lib/organization-invitation", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/organization-invitation")>();

  return {
    ...actual,
    inspectOrganizationInvitation: vi.fn(() => Promise.resolve(state.inspection)),
    redeemOrganizationInvitationById: vi.fn(() => Promise.resolve(state.redemption))
  };
});

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

vi.mock("next/headers", () => ({
  cookies: () => ({
    get: (name: string) =>
      name === PENDING_INVITATION_COOKIE && state.requestCookie !== undefined
        ? { name, value: state.requestCookie }
        : undefined,
    set: (name: string, value: string) => {
      state.writtenCookies.push({ name, value });
    }
  })
}));

const { GET: continueInvitation } = await import("@/app/join/[token]/continue/route");
const { resumePendingInvitationAction } = await import("@/lib/organization-invitation-actions");

const token = "b".repeat(43);
const joinPath = `/join/${token}`;

describe("invitation handoff routes", () => {
  const originalBaseUrl = process.env.APP_BASE_URL;
  const originalSecret = process.env.SESSION_SECRET;

  beforeEach(() => {
    process.env.APP_BASE_URL = "https://pongladder.com";
    process.env.SESSION_SECRET = "invitation-handoff-test-secret-value";
    state.sessionUser = null;
    state.inspection = { availability: "valid", id: "invitation-1" };
    state.redemption = { outcome: "redeemed", organizationName: "Polisen", organizationSlug: "polisen" };
    state.requestCookie = undefined;
    state.writtenCookies = [];
  });

  afterEach(() => {
    restore("APP_BASE_URL", originalBaseUrl);
    restore("SESSION_SECRET", originalSecret);
  });

  describe("starting the handoff", () => {
    it("remembers the invitation before sending a new visitor into account creation", async () => {
      const response = await continueInvitation(request(`${joinPath}/continue`), { params: { token } });

      expect(response.headers.get("location")).toBe(
        `https://pongladder.com/login?next=${encodeURIComponent(joinPath)}`
      );
      expect(readPendingInvitation(response.cookies.get(PENDING_INVITATION_COOKIE)?.value)).toBe("invitation-1");
    });

    it("remembers the invitation while an authenticated user verifies their email", async () => {
      state.sessionUser = { user: { id: "user-1", email: "player@example.com", emailVerifiedAt: null } };

      const response = await continueInvitation(request(`${joinPath}/continue`), { params: { token } });

      expect(response.headers.get("location")).toBe(
        `https://pongladder.com/verify-email?next=${encodeURIComponent(joinPath)}`
      );
      expect(readPendingInvitation(response.cookies.get(PENDING_INVITATION_COOKIE)?.value)).toBe("invitation-1");
    });

    it("sends an eligible user straight to redemption without storing a handoff", async () => {
      state.sessionUser = { user: { id: "user-1", email: "player@example.com", emailVerifiedAt: new Date() } };

      const response = await continueInvitation(request(`${joinPath}/continue`), { params: { token } });

      expect(response.headers.get("location")).toBe(`https://pongladder.com${joinPath}`);
      expect(response.cookies.get(PENDING_INVITATION_COOKIE)).toBeUndefined();
    });

    it("never stores a handoff for an invitation that can no longer be used", async () => {
      state.inspection = { availability: "revoked", id: "invitation-1", organization: { name: "Polisen" } };

      const response = await continueInvitation(request(`${joinPath}/continue`), { params: { token } });

      expect(response.headers.get("location")).toBe(`https://pongladder.com${joinPath}`);
      expect(response.cookies.get(PENDING_INVITATION_COOKIE)).toBeUndefined();
    });

    it("rejects a malformed invitation credential without touching the database", async () => {
      const response = await continueInvitation(request("/join/nope/continue"), { params: { token: "nope" } });

      expect(response.headers.get("location")).toBe("https://pongladder.com/join/invalid");
      expect(response.cookies.get(PENDING_INVITATION_COOKIE)).toBeUndefined();
    });
  });

  describe("resuming the handoff", () => {
    it("redeems the remembered invitation once the account is eligible", async () => {
      state.sessionUser = { user: { id: "user-1", email: "player@example.com", emailVerifiedAt: new Date() } };
      state.requestCookie = pendingCookie("invitation-1");

      expect(await resumePendingInvitationAction()).toEqual({
        outcome: "redeemed",
        organizationName: "Polisen",
        organizationSlug: "polisen"
      });
      expect(clearedHandoff()).toBe(true);
    });

    it("finishes cleanly when the account already belongs to the organization", async () => {
      state.sessionUser = { user: { id: "user-1", email: "player@example.com", emailVerifiedAt: new Date() } };
      state.requestCookie = pendingCookie("invitation-1");
      state.redemption = { outcome: "already_member", organizationName: "Polisen", organizationSlug: "polisen" };

      expect(await resumePendingInvitationAction()).toMatchObject({ outcome: "already_member" });
      expect(clearedHandoff()).toBe(true);
    });

    it("reports an invitation that lapsed while the account was being created", async () => {
      state.sessionUser = { user: { id: "user-1", email: "player@example.com", emailVerifiedAt: new Date() } };
      state.requestCookie = pendingCookie("invitation-1");
      state.redemption = { outcome: "expired", organizationName: "Polisen" };

      expect(await resumePendingInvitationAction()).toMatchObject({ outcome: "expired" });
      expect(clearedHandoff()).toBe(true);
    });

    it("keeps the handoff while authentication is still incomplete", async () => {
      state.requestCookie = pendingCookie("invitation-1");

      expect(await resumePendingInvitationAction()).toEqual({ outcome: "authentication_required" });

      state.sessionUser = { user: { id: "user-1", email: "player@example.com", emailVerifiedAt: null } };

      expect(await resumePendingInvitationAction()).toEqual({ outcome: "verification_required" });
      expect(state.writtenCookies).toHaveLength(0);
    });

    it("reports nothing pending when the handoff is missing or forged", async () => {
      state.sessionUser = { user: { id: "user-1", email: "player@example.com", emailVerifiedAt: new Date() } };
      state.requestCookie = "v1.forged.9999999999999.signature";

      expect(await resumePendingInvitationAction()).toEqual({ outcome: "none" });
      expect(clearedHandoff()).toBe(true);
    });
  });
});

function request(path: string) {
  return new Request(`http://0.0.0.0:3000${path}`);
}

function clearedHandoff() {
  return state.writtenCookies.some((cookie) => cookie.name === PENDING_INVITATION_COOKIE && cookie.value === "");
}

function pendingCookie(invitationId: string) {
  return signPendingInvitation(invitationId, Date.now() + 60 * 60 * 1000);
}

function restore(name: string, value: string | undefined) {
  if (value === undefined) {
    delete process.env[name];
  } else {
    process.env[name] = value;
  }
}
