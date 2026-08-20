import type { Metadata } from "next";
import OrganizationRulesPage from "@/features/organization-pages/RulesPage";
import { toSupportedLocale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/dictionary";

export const dynamic = "force-dynamic";

export function generateMetadata({ params }: { params: { locale: string } }): Metadata {
  return { title: getDictionary(params.locale).metadata.rulesTitle };
}

export default function RulesPage({ params }: { params: { locale: string; slug: string } }) {
  return (
    <OrganizationRulesPage
      locale={toSupportedLocale(params.locale)}
      organizationSlug={params.slug}
    />
  );
}
