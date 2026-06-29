export const SESSION_COOKIE_NAME = "pong_ladder_session";
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7;

export type SessionPayload = {
  sub: string;
  username: string;
  email: string;
  iat: number;
  exp: number;
};

function getSecret() {
  const secret = process.env.SESSION_SECRET;

  if (!secret || secret.length < 32) {
    throw new Error("SESSION_SECRET must be set to a random value with at least 32 characters.");
  }

  return secret;
}

function encodeBase64Url(value: string | ArrayBuffer) {
  const bytes = typeof value === "string" ? new TextEncoder().encode(value) : new Uint8Array(value);
  const binary = Array.from(bytes, (byte) => String.fromCharCode(byte)).join("");
  const base64 = btoa(binary);

  return base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function decodeBase64Url(value: string) {
  const base64 = value.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(value.length / 4) * 4, "=");
  const binary = atob(base64);
  return new Uint8Array(Array.from(binary, (char) => char.charCodeAt(0)));
}

async function getSigningKey() {
  return crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(getSecret()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"]
  );
}

export async function createSessionToken(payload: Omit<SessionPayload, "iat" | "exp">) {
  const now = Math.floor(Date.now() / 1000);
  const body: SessionPayload = {
    ...payload,
    iat: now,
    exp: now + SESSION_MAX_AGE_SECONDS
  };
  const encodedPayload = encodeBase64Url(JSON.stringify(body));
  const signature = await crypto.subtle.sign("HMAC", await getSigningKey(), new TextEncoder().encode(encodedPayload));

  return `${encodedPayload}.${encodeBase64Url(signature)}`;
}

export async function verifySessionToken(token?: string | null) {
  if (!token) {
    return null;
  }

  const [encodedPayload, encodedSignature] = token.split(".");

  if (!encodedPayload || !encodedSignature) {
    return null;
  }

  try {
    const valid = await crypto.subtle.verify(
      "HMAC",
      await getSigningKey(),
      decodeBase64Url(encodedSignature),
      new TextEncoder().encode(encodedPayload)
    );

    if (!valid) {
      return null;
    }

    const payload = JSON.parse(new TextDecoder().decode(decodeBase64Url(encodedPayload))) as SessionPayload;

    if (!payload.sub || !payload.email || !payload.username || payload.exp < Math.floor(Date.now() / 1000)) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}

export function sessionCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS
  };
}
