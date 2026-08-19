import type { Metadata } from "next";
import OrganizationPlayerPage from "@/features/organization-pages/PlayerPage";
import { toSupportedLocale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/dictionary";

export const dynamic = "force-dynamic";

export function generateMetadata({ params }: { params: { locale: string } }): Metadata {
  return { title: getDictionary(params.locale).metadata.playersTitle };
}

export default function PlayerPage({ params }: { params: { locale: string; slug: string; id: string } }) {
  return (
    <OrganizationPlayerPage
      locale={toSupportedLocale(params.locale)}
      organizationSlug={params.slug}
      playerId={params.id}
    />
  );
}
