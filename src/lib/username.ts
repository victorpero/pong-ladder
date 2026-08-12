import type { PrismaClient } from "@prisma/client";

const MAX_USERNAME_LENGTH = 30;

export function usernameBase(value: string) {
  const normalized = value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, MAX_USERNAME_LENGTH);

  return normalized || "player";
}

export function usernameCandidate(base: string, attempt: number) {
  if (attempt === 0) {
    return base.slice(0, MAX_USERNAME_LENGTH);
  }

  const suffix = `-${attempt + 1}`;
  return `${base.slice(0, MAX_USERNAME_LENGTH - suffix.length)}${suffix}`;
}

export async function findAvailableUsername(
  client: Pick<PrismaClient, "user">,
  value: string
) {
  const base = usernameBase(value);

  for (let attempt = 0; attempt < 1000; attempt += 1) {
    const candidate = usernameCandidate(base, attempt);
    const existing = await client.user.findUnique({ where: { username: candidate }, select: { id: true } });

    if (!existing) {
      return candidate;
    }
  }

  throw new Error("Unable to allocate a username.");
}
