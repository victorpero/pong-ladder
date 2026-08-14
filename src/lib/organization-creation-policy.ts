const reservedOrganizationSlugs = new Set([
  "account",
  "admin",
  "api",
  "awaiting-approval",
  "challenges",
  "join",
  "ladder",
  "login",
  "logout",
  "matches",
  "new",
  "org",
  "organizations",
  "players",
  "rules",
  "teams",
  "verify-email"
]);

export function normalizeOrganizationSlug(value: string) {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
}

export function isReservedOrganizationSlug(slug: string) {
  return reservedOrganizationSlugs.has(slug);
}

export function canCreateOrganizations(email: string) {
  if (process.env.ORGANIZATION_CREATION_ENABLED?.trim().toLowerCase() === "true") {
    return true;
  }

  const normalizedEmail = email.trim().toLowerCase();
  return (process.env.ORGANIZATION_CREATOR_EMAILS ?? "")
    .split(",")
    .map((candidate) => candidate.trim().toLowerCase())
    .filter(Boolean)
    .includes(normalizedEmail);
}
