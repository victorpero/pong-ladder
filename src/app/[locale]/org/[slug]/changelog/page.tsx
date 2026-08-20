import type { Metadata } from "next";
import ChangelogPage from "@/features/changelog/ChangelogPage";
import { requireOrganizationUser } from "@/lib/authz";
import { toSupportedLocale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/dictionary";
import { organizationPath } from "@/lib/organization-paths";

export const dynamic = "force-dynamic";

export function generateMetadata({ params }: { params: { locale: string } }): Metadata {
  return { title: getDictionary(params.locale).metadata.changelogTitle };
}

// Release notes carry no organization data, but this route keeps the organization
// chrome around them, so it enforces the same access check as its siblings.
export default async function OrganizationChangelog({
  params
}: {
  params: { locale: string; slug: string };
}) {
  const locale = toSupportedLocale(params.locale);
  const dictionary = getDictionary(locale);

  await requireOrganizationUser(params.slug, organizationPath(locale, params.slug, "changelog"));

  return (
    <ChangelogPage
      locale={locale}
      backHref={organizationPath(locale, params.slug, "ladder")}
      backLabel={dictionary.changelog.backToLadder}
    />
  );
}
