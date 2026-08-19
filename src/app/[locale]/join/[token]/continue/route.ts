import { NextResponse } from "next/server";
import { getAppBaseUrl } from "@/lib/app-url";
import { getSessionUser, verifyEmailPath } from "@/lib/authz";
import { toSupportedLocale } from "@/lib/i18n/config";
import { inspectOrganizationInvitation, isOrganizationInvitationToken } from "@/lib/organization-invitation";
import { appPath, loginPath } from "@/lib/organization-paths";
import { pendingInvitationCookie } from "@/lib/pending-invitation";

export const dynamic = "force-dynamic";

export async function GET(_request: Request, { params }: { params: { locale: string; token: string } }) {
  const baseUrl = getAppBaseUrl();
  const locale = toSupportedLocale(params.locale);
  const token = params.token;

  if (!isOrganizationInvitationToken(token)) {
    return NextResponse.redirect(new URL(appPath(locale, "/join/invalid"), baseUrl));
  }

  const joinPath = appPath(locale, `/join/${token}`);
  const invitation = await inspectOrganizationInvitation(token);

  if (invitation.availability !== "valid") {
    return NextResponse.redirect(new URL(joinPath, baseUrl));
  }

  const sessionUser = await getSessionUser();

  if (sessionUser?.user.emailVerifiedAt) {
    return NextResponse.redirect(new URL(joinPath, baseUrl));
  }

  const destination = sessionUser
    ? `${verifyEmailPath(locale)}?next=${encodeURIComponent(joinPath)}`
    : loginPath(locale, joinPath);
  const response = NextResponse.redirect(new URL(destination, baseUrl));
  const pending = pendingInvitationCookie(invitation.id);
  response.cookies.set(pending.name, pending.value, pending.options);

  return response;
}
