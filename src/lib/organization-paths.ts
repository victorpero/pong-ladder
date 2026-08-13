export const organizationsPath = "/organizations";

const organizationRoutePattern = /^\/org\/([^/]+)(?:\/|$)/;
const invitationRoutePattern = /^\/join\/[^/?#]+(?:[?#].*)?$/;

export function organizationPath(slug: string, section = "ladder", suffix = "") {
  const encodedSlug = encodeURIComponent(slug);
  const normalizedSection = section.replace(/^\/+|\/+$/g, "");
  const normalizedSuffix = suffix ? `/${suffix.replace(/^\/+/, "")}` : "";

  return normalizedSection ? `/org/${encodedSlug}/${normalizedSection}${normalizedSuffix}` : `/org/${encodedSlug}`;
}

export function organizationSlugFromPath(pathname: string) {
  const match = pathname.match(organizationRoutePattern);

  if (!match) {
    return null;
  }

  try {
    return decodeURIComponent(match[1]);
  } catch {
    return null;
  }
}

export function postAuthenticationPath(requestedPath?: string | null) {
  if (requestedPath && invitationRoutePattern.test(requestedPath)) {
    return requestedPath;
  }

  return organizationsPath;
}
