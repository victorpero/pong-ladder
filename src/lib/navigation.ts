import type { Locale } from "@/lib/i18n/config";
import { appPath, organizationPath, organizationSlugFromPath } from "@/lib/organization-paths";

/**
 * Primary organization navigation, shared by every viewport and language. Each
 * section names its own key in `dictionary.nav`, so the label is translated
 * rather than carried here.
 *
 * The ladder is the player directory and the entry point into player profiles,
 * so there is deliberately no top-level Players tab. The full member directory
 * — including members who have not joined the active season — stays reachable
 * from the ladder standings.
 */
export const organizationNavigationSections = ["ladder", "matches", "challenges", "teams", "rules"] as const;

export type OrganizationNavigationSection = (typeof organizationNavigationSections)[number];

export const changelogPath = "/changelog";

/**
 * Keeps the What's new link inside the organization and the language the viewer
 * is already in, so following it never drops either context.
 */
export function changelogPathForPathname(locale: Locale, pathname: string) {
  const organizationSlug = organizationSlugFromPath(pathname);

  return organizationSlug
    ? organizationPath(locale, organizationSlug, "changelog")
    : appPath(locale, changelogPath);
}
