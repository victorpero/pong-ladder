import type { Metadata } from "next";
import OrganizationMatchesPage from "@/features/organization-pages/MatchesPage";
import { toSupportedLocale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/dictionary";

export const dynamic = "force-dynamic";

export function generateMetadata({ params }: { params: { locale: string } }): Metadata {
  return { title: getDictionary(params.locale).metadata.matchesTitle };
}

export default function MatchesPage({
  params,
  searchParams
}: {
  params: { locale: string; slug: string };
  searchParams?: { challengeId?: string };
}) {
  return (
    <OrganizationMatchesPage
      locale={toSupportedLocale(params.locale)}
      organizationSlug={params.slug}
      searchParams={searchParams}
    />
  );
}
