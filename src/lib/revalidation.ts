import { revalidatePath } from "next/cache";
import { SUPPORTED_LOCALES } from "@/lib/i18n/config";
import { organizationPath, organizationsPath } from "@/lib/organization-paths";

/** Every language has its own cache entry, so a change has to refresh all of them. */
export function revalidateOrganizationSections(organizationSlug: string, sections: string[]) {
  for (const locale of SUPPORTED_LOCALES) {
    for (const section of sections) {
      revalidatePath(organizationPath(locale, organizationSlug, section));
    }
  }
}

export function revalidateOrganizationSelection() {
  for (const locale of SUPPORTED_LOCALES) {
    revalidatePath(organizationsPath(locale));
  }
}
