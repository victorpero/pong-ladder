import { MembershipRole } from "@prisma/client";

export function canRotateOrganizationInvite(role: MembershipRole) {
  return role === MembershipRole.OWNER || role === MembershipRole.ADMIN;
}

export function createOrganizationCodeInvitationUrl(baseUrl: string, accessCode: string) {
  const origin = new URL(baseUrl).origin;
  return `${origin}/join/code#code=${encodeURIComponent(accessCode)}`;
}
