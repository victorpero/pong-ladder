import { redirect } from "next/navigation";
import { getSessionUser, verifyEmailPath } from "@/lib/authz";
import { toSupportedLocale } from "@/lib/i18n/config";
import { appPath, loginPath, organizationsPath } from "@/lib/organization-paths";

export const dynamic = "force-dynamic";

export default async function AwaitingApprovalPage({ params }: { params: { locale: string } }) {
  const locale = toSupportedLocale(params.locale);
  const awaitingApprovalPath = appPath(locale, "/awaiting-approval");
  const sessionUser = await getSessionUser();

  if (!sessionUser) {
    redirect(loginPath(locale, awaitingApprovalPath));
  }

  if (!sessionUser.user.emailVerifiedAt) {
    redirect(`${verifyEmailPath(locale)}?next=${encodeURIComponent(awaitingApprovalPath)}`);
  }

  redirect(organizationsPath(locale));
}
