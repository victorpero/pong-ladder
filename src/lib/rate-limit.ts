import { headers } from "next/headers";

type RateLimitEntry = {
  count: number;
  resetAt: number;
};

type RateLimitStore = Map<string, RateLimitEntry>;

const globalForRateLimit = globalThis as typeof globalThis & {
  pongLadderRateLimits?: RateLimitStore;
};

const store = globalForRateLimit.pongLadderRateLimits ?? new Map<string, RateLimitEntry>();
globalForRateLimit.pongLadderRateLimits = store;

export class RateLimitError extends Error {
  constructor() {
    super("Too many attempts. Please wait a bit and try again.");
  }
}

export function getClientRateLimitKey(scope: string, identifier = "default") {
  const requestHeaders = headers();
  const forwardedFor = requestHeaders.get("x-forwarded-for")?.split(",")[0]?.trim();
  const ip =
    forwardedFor ||
    requestHeaders.get("x-real-ip") ||
    requestHeaders.get("cf-connecting-ip") ||
    requestHeaders.get("fly-client-ip") ||
    "unknown";

  return `${scope}:${identifier}:${ip}`;
}

export function consumeRateLimit(key: string, limit: number, windowMs: number) {
  const now = Date.now();
  const existing = store.get(key);

  if (!existing || existing.resetAt <= now) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    pruneExpiredEntries(now);
    return;
  }

  if (existing.count >= limit) {
    throw new RateLimitError();
  }

  existing.count += 1;
}

function pruneExpiredEntries(now: number) {
  if (store.size < 500) {
    return;
  }

  for (const [key, entry] of store) {
    if (entry.resetAt <= now) {
      store.delete(key);
    }
  }
}
