import { redirect } from "next/navigation";
import { toSupportedLocale } from "@/lib/i18n/config";
import { organizationPath } from "@/lib/organization-paths";

export default function OrganizationPage({ params }: { params: { locale: string; slug: string } }) {
  redirect(organizationPath(toSupportedLocale(params.locale), params.slug));
}
