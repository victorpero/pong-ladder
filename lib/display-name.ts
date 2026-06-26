export type DisplayUser = {
  id: string;
  username: string;
  fullName: string;
};

type NameParts = {
  firstName: string;
  lastNames: string;
  lastInitial: string;
  lastLetter: string;
};

export function normalizeFullName(fullName: string) {
  return fullName.trim().replace(/\s+/g, " ");
}

function getNameParts(user: Pick<DisplayUser, "username" | "fullName">): NameParts {
  const normalized = normalizeFullName(user.fullName || user.username);
  const parts = normalized.split(" ").filter(Boolean);
  const firstName = parts[0] ?? user.username;
  const lastNames = parts.slice(1).join(" ");
  const lastNameForInitial = parts[1] ?? "";
  const lastNameForLastLetter = parts.at(-1) ?? "";

  return {
    firstName,
    lastNames,
    lastInitial: lastNameForInitial.charAt(0).toUpperCase(),
    lastLetter: lastNameForLastLetter.charAt(lastNameForLastLetter.length - 1).toLowerCase()
  };
}

function basePublicName(user: DisplayUser) {
  const parts = getNameParts(user);

  if (!parts.lastInitial) {
    return parts.firstName;
  }

  return `${parts.firstName} ${parts.lastInitial}.`;
}

function collisionPublicName(user: DisplayUser) {
  const parts = getNameParts(user);

  if (!parts.lastInitial) {
    return parts.firstName;
  }

  return `${parts.firstName} ${parts.lastInitial}${parts.lastLetter}.`;
}

export function getPublicPlayerNames(users: DisplayUser[]) {
  const baseCounts = new Map<string, number>();

  for (const user of users) {
    const base = basePublicName(user);
    baseCounts.set(base, (baseCounts.get(base) ?? 0) + 1);
  }

  return new Map(
    users.map((user) => {
      const base = basePublicName(user);
      const displayName = (baseCounts.get(base) ?? 0) > 1 ? collisionPublicName(user) : base;

      return [user.id, displayName];
    })
  );
}

export function getPublicPlayerName(user: DisplayUser, users: DisplayUser[] = [user]) {
  return getPublicPlayerNames(users).get(user.id) ?? basePublicName(user);
}

