import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getAppBaseUrl } from "@/lib/app-url";
import { getSessionUser, verifyEmailPath } from "@/lib/authz";
import { redeemOrganizationInvitationById } from "@/lib/organization-invitation";
import { organizationsPath } from "@/lib/organization-paths";
import { clearedPendingInvitationCookie, PENDING_INVITATION_COOKIE, readPendingInvitation } from "@/lib/pending-invitation";

export const dynamic = "force-dynamic";

export async function GET() {
  const baseUrl = getAppBaseUrl();
  const invitationId = readPendingInvitation(cookies().get(PENDING_INVITATION_COOKIE)?.value);

  if (!invitationId) {
    return forget(new URL(organizationsPath, baseUrl));
  }

  const sessionUser = await getSessionUser();

  if (!sessionUser) {
    return NextResponse.redirect(
      new URL(`/login?next=${encodeURIComponent(organizationsPath)}`, baseUrl)
    );
  }

  if (!sessionUser.user.emailVerifiedAt) {
    return NextResponse.redirect(
      new URL(`${verifyEmailPath}?next=${encodeURIComponent(organizationsPath)}`, baseUrl)
    );
  }

  const redemption = await redeemOrganizationInvitationById(invitationId, sessionUser.user.id);
  const destination = new URL(organizationsPath, baseUrl);

  if (redemption.outcome === "redeemed" || redemption.outcome === "already_member") {
    destination.searchParams.set("joined", redemption.organizationSlug);
  } else {
    destination.searchParams.set("invitation", redemption.outcome);
  }

  return forget(destination);
}

function forget(destination: URL) {
  const response = NextResponse.redirect(destination);
  const cleared = clearedPendingInvitationCookie();
  response.cookies.set(cleared.name, cleared.value, cleared.options);

  return response;
}
