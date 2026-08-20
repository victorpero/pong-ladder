import { redirect } from "next/navigation";
import { toSupportedLocale } from "@/lib/i18n/config";
import { organizationsPath } from "@/lib/organization-paths";

export default function PlayerPage({ params }: { params: { locale: string } }) {
  redirect(organizationsPath(toSupportedLocale(params.locale)));
}
