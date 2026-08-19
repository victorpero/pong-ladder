import type { Metadata } from "next";
import OrganizationPlayersPage from "@/features/organization-pages/PlayersPage";
import { toSupportedLocale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/dictionary";

export const dynamic = "force-dynamic";

export function generateMetadata({ params }: { params: { locale: string } }): Metadata {
  return { title: getDictionary(params.locale).metadata.playersTitle };
}

export default function PlayersPage({ params }: { params: { locale: string; slug: string } }) {
  return (
    <OrganizationPlayersPage
      locale={toSupportedLocale(params.locale)}
      organizationSlug={params.slug}
    />
  );
}
