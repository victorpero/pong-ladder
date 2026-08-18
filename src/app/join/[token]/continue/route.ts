import { NextResponse } from "next/server";
import { getAppBaseUrl } from "@/lib/app-url";
import { getSessionUser, verifyEmailPath } from "@/lib/authz";
import { inspectOrganizationInvitation, isOrganizationInvitationToken } from "@/lib/organization-invitation";
import { pendingInvitationCookie } from "@/lib/pending-invitation";

export const dynamic = "force-dynamic";

export async function GET(_request: Request, { params }: { params: { token: string } }) {
  const baseUrl = getAppBaseUrl();
  const token = params.token;

  if (!isOrganizationInvitationToken(token)) {
    return NextResponse.redirect(new URL("/join/invalid", baseUrl));
  }

  const joinPath = `/join/${token}`;
  const invitation = await inspectOrganizationInvitation(token);

  if (invitation.availability !== "valid") {
    return NextResponse.redirect(new URL(joinPath, baseUrl));
  }

  const sessionUser = await getSessionUser();

  if (sessionUser?.user.emailVerifiedAt) {
    return NextResponse.redirect(new URL(joinPath, baseUrl));
  }

  const destination = sessionUser
    ? `${verifyEmailPath}?next=${encodeURIComponent(joinPath)}`
    : `/login?next=${encodeURIComponent(joinPath)}`;
  const response = NextResponse.redirect(new URL(destination, baseUrl));
  const pending = pendingInvitationCookie(invitation.id);
  response.cookies.set(pending.name, pending.value, pending.options);

  return response;
}
