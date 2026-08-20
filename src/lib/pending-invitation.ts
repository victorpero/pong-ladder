import { createHmac, timingSafeEqual } from "node:crypto";

export const PENDING_INVITATION_COOKIE = "pong_ladder.pending_invitation";
export const PENDING_INVITATION_TTL_MS = 60 * 60 * 1000;

const payloadVersion = "v1";
const signatureContext = "pong-ladder:pending-invitation:v1";

export type PendingInvitationCookie = {
  name: string;
  value: string;
  options: {
    httpOnly: true;
    sameSite: "lax";
    secure: boolean;
    path: string;
    maxAge: number;
  };
};

export function signPendingInvitation(
  invitationId: string,
  expiresAt: number,
  secret = getPendingInvitationSecret()
) {
  const encodedId = Buffer.from(invitationId, "utf8").toString("base64url");
  const body = `${payloadVersion}.${encodedId}.${expiresAt}`;

  return `${body}.${signPayload(body, secret)}`;
}

export function readPendingInvitation(
  payload: string | undefined | null,
  now = Date.now(),
  secret = getPendingInvitationSecret()
) {
  if (!payload) {
    return null;
  }

  const [version, encodedId, encodedExpiry, signature, extra] = payload.split(".");

  if (version !== payloadVersion || !encodedId || !encodedExpiry || !signature || extra !== undefined) {
    return null;
  }

  const body = `${version}.${encodedId}.${encodedExpiry}`;

  if (!signaturesMatch(signature, signPayload(body, secret))) {
    return null;
  }

  const expiresAt = Number(encodedExpiry);

  if (!Number.isSafeInteger(expiresAt) || expiresAt <= now) {
    return null;
  }

  const invitationId = Buffer.from(encodedId, "base64url").toString("utf8");

  return invitationId ? invitationId : null;
}

export function pendingInvitationCookie(
  invitationId: string,
  now = Date.now(),
  ttlMs = PENDING_INVITATION_TTL_MS
): PendingInvitationCookie {
  const expiresAt = now + ttlMs;

  return {
    name: PENDING_INVITATION_COOKIE,
    value: signPendingInvitation(invitationId, expiresAt),
    options: {
      httpOnly: true,
      sameSite: "lax",
      secure: usesSecureCookies(),
      path: "/",
      maxAge: Math.floor(ttlMs / 1000)
    }
  };
}

export function clearedPendingInvitationCookie(): PendingInvitationCookie {
  return {
    name: PENDING_INVITATION_COOKIE,
    value: "",
    options: {
      httpOnly: true,
      sameSite: "lax",
      secure: usesSecureCookies(),
      path: "/",
      maxAge: 0
    }
  };
}

function signPayload(body: string, secret: string) {
  return createHmac("sha256", secret).update(`${signatureContext}:${body}`, "utf8").digest("base64url");
}

function signaturesMatch(candidate: string, expected: string) {
  const candidateBytes = Buffer.from(candidate, "base64url");
  const expectedBytes = Buffer.from(expected, "base64url");

  return candidateBytes.length === expectedBytes.length && timingSafeEqual(candidateBytes, expectedBytes);
}

function usesSecureCookies() {
  if (process.env.SESSION_COOKIE_SECURE) {
    return process.env.SESSION_COOKIE_SECURE === "true";
  }

  return process.env.APP_BASE_URL?.trim().startsWith("https:") ?? false;
}

function getPendingInvitationSecret() {
  const secret =
    process.env.BETTER_AUTH_SECRET ||
    process.env.SESSION_SECRET ||
    process.env.ORGANIZATION_CREDENTIAL_SECRET ||
    process.env.ORGANIZATION_ACCESS_CODE_SECRET;

  if (!secret) {
    throw new Error("Pending invitation handoff is not configured.");
  }

  return secret;
}
