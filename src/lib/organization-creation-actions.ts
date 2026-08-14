"use server";

import {
  MembershipJoinMethod,
  MembershipRole,
  MembershipStatus,
  OrganizationAuditAction,
  OrganizationJoinPolicy,
  OrganizationType,
  OrganizationVisibility,
  Prisma
} from "@prisma/client";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireAuthenticatedUser, verifyEmailPath } from "@/lib/authz";
import {
  canCreateOrganizations,
  isReservedOrganizationSlug,
  normalizeOrganizationSlug
} from "@/lib/organization-creation-policy";
import { generateOrganizationAccessCode, hashOrganizationAccessCode } from "@/lib/organization-access-code";
import { encryptOrganizationCredential } from "@/lib/organization-credential";
import { normalizeEmailDomains } from "@/lib/organization-domain";
import { organizationsPath } from "@/lib/organization-paths";
import { prisma } from "@/lib/prisma";

export type CreateOrganizationState = { error?: string };

const createSchema = z.object({
  name: z.string().trim().min(2, "Enter an organization name.").max(100),
  slug: z.string().trim().min(2, "Enter a URL slug.").max(60),
  type: z.nativeEnum(OrganizationType),
  joinPolicy: z.nativeEnum(OrganizationJoinPolicy),
  visibility: z.nativeEnum(OrganizationVisibility)
});

function value(formData: FormData, key: string) {
  return formData.get(key)?.toString() ?? "";
}

export async function createOrganization(
  _state: CreateOrganizationState,
  formData: FormData
): Promise<CreateOrganizationState> {
  const { user } = await requireAuthenticatedUser("/organizations/new");

  if (!user.emailVerifiedAt) {
    redirect(`${verifyEmailPath}?next=${encodeURIComponent("/organizations/new")}`);
  }

  if (!canCreateOrganizations(user.email)) {
    return { error: "Organization creation is not enabled for this account." };
  }

  const parsed = createSchema.safeParse({
    name: value(formData, "name"),
    slug: value(formData, "slug"),
    type: value(formData, "type"),
    joinPolicy: value(formData, "joinPolicy"),
    visibility: value(formData, "visibility")
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check the organization details." };
  }

  const slug = normalizeOrganizationSlug(parsed.data.slug);

  if (slug.length < 2 || slug.length > 60 || isReservedOrganizationSlug(slug)) {
    return { error: "Choose a different URL slug." };
  }

  const domains = normalizeEmailDomains(
    value(formData, "allowedEmailDomains")
      .split(/[\s,]+/)
      .filter(Boolean)
  );

  if (parsed.data.joinPolicy === OrganizationJoinPolicy.EMAIL_DOMAIN && domains.length === 0) {
    return { error: "Add at least one allowed email domain for this join policy." };
  }

  const accessCode = generateOrganizationAccessCode();
  const accessCodeUpdatedAt = new Date();

  try {
    await prisma.$transaction(async (tx) => {
      const organization = await tx.organization.create({
        data: {
          name: parsed.data.name,
          slug,
          type: parsed.data.type,
          joinPolicy: parsed.data.joinPolicy,
          visibility: parsed.data.visibility,
          allowedEmailDomains: domains,
          accessCodeHash: hashOrganizationAccessCode(accessCode),
          accessCodeCiphertext: encryptOrganizationCredential(accessCode),
          accessCodeEnabled: true,
          accessCodeUpdatedAt
        }
      });
      const membership = await tx.membership.create({
        data: {
          userId: user.id,
          organizationId: organization.id,
          role: MembershipRole.OWNER,
          status: MembershipStatus.ACTIVE,
          joinMethod: MembershipJoinMethod.ADMIN_CREATED,
          activatedAt: new Date(),
          reviewedAt: new Date(),
          reviewedById: user.id
        }
      });
      await tx.organizationAuditEvent.create({
        data: {
          organizationId: organization.id,
          actorMembershipId: membership.id,
          action: OrganizationAuditAction.ORGANIZATION_CREATED
        }
      });
      await tx.organizationAuditEvent.create({
        data: {
          organizationId: organization.id,
          actorMembershipId: membership.id,
          action: OrganizationAuditAction.ACCESS_CODE_GENERATED
        }
      });
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return { error: "That URL slug is already in use." };
    }

    throw error;
  }

  redirect(`${organizationsPath}?created=${encodeURIComponent(slug)}`);
}
