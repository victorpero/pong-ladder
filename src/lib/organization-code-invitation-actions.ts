"use server";

import { getSessionUser } from "@/lib/authz";
import { inspectOrganizationCodeInvitation } from "@/lib/organization-code-invitation";

export type PrepareOrganizationCodeInvitationState =
  | { outcome: "invalid" }
  | { outcome: "authentication_required"; organizationName: string }
  | { outcome: "verification_required"; organizationName: string; email: string }
  | { outcome: "ready"; organizationName: string };

export async function prepareOrganizationCodeInvitation(
  accessCode: string
): Promise<PrepareOrganizationCodeInvitationState> {
  const invitation = await inspectOrganizationCodeInvitation(accessCode);

  if (invitation.availability === "invalid") {
    return { outcome: "invalid" };
  }

  const sessionUser = await getSessionUser();

  if (!sessionUser) {
    return { outcome: "authentication_required", organizationName: invitation.organization.name };
  }

  if (!sessionUser.user.emailVerifiedAt) {
    return {
      outcome: "verification_required",
      organizationName: invitation.organization.name,
      email: sessionUser.user.email
    };
  }

  return { outcome: "ready", organizationName: invitation.organization.name };
}
