import type { Metadata } from "next";
import OrganizationAccountPage from "@/features/organization-pages/AccountPage";
import { toSupportedLocale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/dictionary";

export const dynamic = "force-dynamic";

export function generateMetadata({ params }: { params: { locale: string } }): Metadata {
  return { title: getDictionary(params.locale).metadata.accountTitle };
}

export default function AccountPage({ params }: { params: { locale: string; slug: string } }) {
  return (
    <OrganizationAccountPage
      locale={toSupportedLocale(params.locale)}
      organizationSlug={params.slug}
    />
  );
}
