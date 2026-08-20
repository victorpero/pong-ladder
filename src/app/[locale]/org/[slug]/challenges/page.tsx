import type { Metadata } from "next";
import OrganizationChallengesPage from "@/features/organization-pages/ChallengesPage";
import { toSupportedLocale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/dictionary";

export const dynamic = "force-dynamic";

export function generateMetadata({ params }: { params: { locale: string } }): Metadata {
  return { title: getDictionary(params.locale).metadata.challengesTitle };
}

export default function ChallengesPage({ params }: { params: { locale: string; slug: string } }) {
  return (
    <OrganizationChallengesPage
      locale={toSupportedLocale(params.locale)}
      organizationSlug={params.slug}
    />
  );
}
