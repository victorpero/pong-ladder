import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  clearedPendingInvitationCookie,
  PENDING_INVITATION_COOKIE,
  PENDING_INVITATION_TTL_MS,
  pendingInvitationCookie,
  readPendingInvitation,
  signPendingInvitation
} from "@/lib/pending-invitation";

describe("pending invitation handoff", () => {
  const originalSecret = process.env.SESSION_SECRET;
  const originalBetterAuthSecret = process.env.BETTER_AUTH_SECRET;
  const originalCookieSecure = process.env.SESSION_COOKIE_SECURE;

  beforeEach(() => {
    process.env.SESSION_SECRET = "pending-invitation-test-secret-value";
    delete process.env.BETTER_AUTH_SECRET;
    delete process.env.SESSION_COOKIE_SECURE;
  });

  afterEach(() => {
    restore("SESSION_SECRET", originalSecret);
    restore("BETTER_AUTH_SECRET", originalBetterAuthSecret);
    restore("SESSION_COOKIE_SECURE", originalCookieSecure);
  });

  it("resumes the invitation the server signed", () => {
    const now = Date.UTC(2026, 7, 18, 12, 0, 0);
    const payload = signPendingInvitation("invitation-1", now + PENDING_INVITATION_TTL_MS);

    expect(readPendingInvitation(payload, now)).toBe("invitation-1");
  });

  it("refuses payloads that were tampered with or signed by another secret", () => {
    const now = Date.UTC(2026, 7, 18, 12, 0, 0);
    const payload = signPendingInvitation("invitation-1", now + PENDING_INVITATION_TTL_MS);
    const [version, encodedId, expiry, signature] = payload.split(".");
    const forgedId = Buffer.from("invitation-2", "utf8").toString("base64url");

    expect(readPendingInvitation(`${version}.${forgedId}.${expiry}.${signature}`, now)).toBeNull();
    expect(readPendingInvitation(`${version}.${encodedId}.${expiry}.${signature}x`, now)).toBeNull();
    expect(readPendingInvitation(payload, now, "a-different-server-secret")).toBeNull();
    expect(readPendingInvitation("invitation-1", now)).toBeNull();
    expect(readPendingInvitation(undefined, now)).toBeNull();
  });

  it("stops resuming once the short-lived handoff window closes", () => {
    const now = Date.UTC(2026, 7, 18, 12, 0, 0);
    const payload = signPendingInvitation("invitation-1", now + PENDING_INVITATION_TTL_MS);

    expect(readPendingInvitation(payload, now + PENDING_INVITATION_TTL_MS)).toBeNull();
  });

  it("carries the invitation in a short-lived http-only cookie instead of the raw token", () => {
    const now = Date.UTC(2026, 7, 18, 12, 0, 0);
    const cookie = pendingInvitationCookie("invitation-1", now);

    expect(cookie.name).toBe(PENDING_INVITATION_COOKIE);
    expect(cookie.options).toMatchObject({
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: PENDING_INVITATION_TTL_MS / 1000
    });
    expect(cookie.value).not.toContain("invitation-1");
    expect(readPendingInvitation(cookie.value, now)).toBe("invitation-1");
  });

  it("marks the handoff cookie secure when the deployment serves HTTPS", () => {
    process.env.SESSION_COOKIE_SECURE = "true";

    expect(pendingInvitationCookie("invitation-1").options.secure).toBe(true);
    expect(clearedPendingInvitationCookie().options.secure).toBe(true);
  });

  it("expires the handoff cookie once the invitation is resolved", () => {
    const cleared = clearedPendingInvitationCookie();

    expect(cleared.name).toBe(PENDING_INVITATION_COOKIE);
    expect(cleared.value).toBe("");
    expect(cleared.options.maxAge).toBe(0);
  });
});

function restore(name: string, value: string | undefined) {
  if (value === undefined) {
    delete process.env[name];
  } else {
    process.env[name] = value;
  }
}
