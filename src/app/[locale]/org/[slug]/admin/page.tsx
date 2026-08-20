import type { Metadata } from "next";
import OrganizationAdminPage from "@/features/organization-pages/AdminPage";
import { toSupportedLocale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/dictionary";

export const dynamic = "force-dynamic";

export function generateMetadata({ params }: { params: { locale: string } }): Metadata {
  return { title: getDictionary(params.locale).metadata.adminTitle };
}

export default function AdminPage({ params }: { params: { locale: string; slug: string } }) {
  return (
    <OrganizationAdminPage
      locale={toSupportedLocale(params.locale)}
      organizationSlug={params.slug}
    />
  );
}
