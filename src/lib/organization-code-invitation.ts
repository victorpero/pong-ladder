import {
  hashOrganizationAccessCode,
  isOrganizationAccessCode,
  normalizeOrganizationAccessCode
} from "@/lib/organization-access-code";
import { prisma } from "@/lib/prisma";

export type OrganizationCodeInvitationInspection =
  | { availability: "invalid" }
  | { availability: "valid"; organization: { name: string } };

export async function inspectOrganizationCodeInvitation(
  accessCode: string
): Promise<OrganizationCodeInvitationInspection> {
  if (!isOrganizationAccessCode(accessCode)) {
    return { availability: "invalid" };
  }

  const organization = await prisma.organization.findFirst({
    where: {
      accessCodeHash: hashOrganizationAccessCode(normalizeOrganizationAccessCode(accessCode)),
      accessCodeEnabled: true
    },
    select: { name: true }
  });

  return organization ? { availability: "valid", organization } : { availability: "invalid" };
}
