import type { Metadata } from "next";
import OrganizationLadderPage from "@/features/organization-pages/LadderPage";
import { toSupportedLocale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/dictionary";

export const dynamic = "force-dynamic";

export function generateMetadata({ params }: { params: { locale: string } }): Metadata {
  return { title: getDictionary(params.locale).metadata.ladderTitle };
}

export default function LadderPage({ params }: { params: { locale: string; slug: string } }) {
  return (
    <OrganizationLadderPage
      locale={toSupportedLocale(params.locale)}
      organizationSlug={params.slug}
    />
  );
}
