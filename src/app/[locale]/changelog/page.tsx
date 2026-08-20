import type { Metadata } from "next";
import ChangelogPage from "@/features/changelog/ChangelogPage";
import { toSupportedLocale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/dictionary";
import { organizationsPath } from "@/lib/organization-paths";

export function generateMetadata({ params }: { params: { locale: string } }): Metadata {
  return { title: getDictionary(params.locale).metadata.changelogTitle };
}

export default function Changelog({ params }: { params: { locale: string } }) {
  const locale = toSupportedLocale(params.locale);
  const dictionary = getDictionary(locale);

  return (
    <ChangelogPage
      locale={locale}
      backHref={organizationsPath(locale)}
      backLabel={dictionary.changelog.backToOrganizations}
    />
  );
}
