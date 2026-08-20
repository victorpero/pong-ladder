import type { Metadata } from "next";
import OrganizationTeamsPage from "@/features/organization-pages/TeamsPage";
import { toSupportedLocale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/dictionary";

export const dynamic = "force-dynamic";

export function generateMetadata({ params }: { params: { locale: string } }): Metadata {
  return { title: getDictionary(params.locale).metadata.teamsTitle };
}

export default function TeamsPage({ params }: { params: { locale: string; slug: string } }) {
  return (
    <OrganizationTeamsPage
      locale={toSupportedLocale(params.locale)}
      organizationSlug={params.slug}
    />
  );
}
