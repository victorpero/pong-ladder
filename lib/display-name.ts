export type DisplayUser = {
  id: string;
  username: string;
  fullName: string;
};

export function normalizeFullName(fullName: string) {
  return fullName.trim().replace(/\s+/g, " ");
}

function displayName(user: Pick<DisplayUser, "username" | "fullName">) {
  return normalizeFullName(user.fullName || user.username);
}

export function getPublicPlayerNames(users: DisplayUser[]) {
  return new Map(users.map((user) => [user.id, displayName(user)]));
}

export function getPublicPlayerName(user: DisplayUser, users: DisplayUser[] = [user]) {
  return getPublicPlayerNames(users).get(user.id) ?? displayName(user);
}
