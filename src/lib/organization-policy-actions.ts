"use server";

import {
  OrganizationAuditAction,
  OrganizationJoinPolicy,
  OrganizationType,
  OrganizationVisibility,
  Prisma
} from "@prisma/client";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireOrganizationAdmin, requireOrganizationOwner } from "@/lib/authz";
import { generateOrganizationAccessCode, hashOrganizationAccessCode } from "@/lib/organization-access-code";
import { encryptOrganizationCredential } from "@/lib/organization-credential";
import { normalizeEmailDomains } from "@/lib/organization-domain";
import { organizationPath, organizationsPath } from "@/lib/organization-paths";
import { prisma } from "@/lib/prisma";

export type OrganizationPolicyState = {
  error?: string;
  success?: string;
};

const slugSchema = z.string().trim().min(1).max(100).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
const policySchema = z.nativeEnum(OrganizationJoinPolicy);
const detailsSchema = z.object({
  name: z.string().trim().min(2).max(100),
  type: z.nativeEnum(OrganizationType),
  visibility: z.nativeEnum(OrganizationVisibility)
});

function value(formData: FormData, key: string) {
  return formData.get(key)?.toString() ?? "";
}

function refreshPolicyPages(slug: string) {
  revalidatePath(organizationsPath);
  revalidatePath(organizationPath(slug, "admin"));
  revalidatePath(organizationPath(slug, "invite"));
}

export async function updateOrganizationJoinPolicy(
  _state: OrganizationPolicyState,
  formData: FormData
): Promise<OrganizationPolicyState> {
  const slug = slugSchema.parse(value(formData, "organizationSlug"));
  const policy = policySchema.parse(value(formData, "joinPolicy"));
  const { organization, membership } = await requireOrganizationOwner(slug);
  const rawDomains = value(formData, "allowedEmailDomains")
    .split(/[\s,]+/)
    .map((domain) => domain.trim())
    .filter(Boolean);
  const allowedEmailDomains = normalizeEmailDomains(rawDomains);

  if (policy === OrganizationJoinPolicy.EMAIL_DOMAIN && allowedEmailDomains.length === 0) {
    return { error: "Add at least one valid email domain, such as example.com." };
  }

  if (rawDomains.length !== allowedEmailDomains.length) {
    return { error: "One or more email domains are invalid or duplicated." };
  }

  await prisma.$transaction(async (tx) => {
    await tx.organization.update({
      where: { id: organization.id },
      data: {
        joinPolicy: policy,
        allowedEmailDomains
      }
    });
    await tx.organizationAuditEvent.create({
      data: {
        organizationId: organization.id,
        actorMembershipId: membership.id,
        action: OrganizationAuditAction.SETTINGS_UPDATED
      }
    });
  });

  refreshPolicyPages(slug);
  return { success: "Join policy updated." };
}

export async function updateOrganizationDetails(
  _state: OrganizationPolicyState,
  formData: FormData
): Promise<OrganizationPolicyState> {
  const slug = slugSchema.parse(value(formData, "organizationSlug"));
  const parsed = detailsSchema.safeParse({
    name: value(formData, "name"),
    type: value(formData, "type"),
    visibility: value(formData, "visibility")
  });

  if (!parsed.success) {
    return { error: "Check the organization name, type, and visibility." };
  }

  const { organization, membership } = await requireOrganizationOwner(slug);

  await prisma.$transaction(async (tx) => {
    await tx.organization.update({ where: { id: organization.id }, data: parsed.data });
    await tx.organizationAuditEvent.create({
      data: {
        organizationId: organization.id,
        actorMembershipId: membership.id,
        action: OrganizationAuditAction.SETTINGS_UPDATED
      }
    });
  });

  refreshPolicyPages(slug);
  return { success: "Organization settings updated." };
}

export async function rotateOrganizationAccessCode(
  _state: OrganizationPolicyState,
  formData: FormData
): Promise<OrganizationPolicyState> {
  const slug = slugSchema.parse(value(formData, "organizationSlug"));
  const { organization, membership } = await requireOrganizationAdmin(slug);
  const wasConfigured = Boolean(organization.accessCodeHash);
  let accessCode = "";

  for (let attempt = 0; attempt < 3; attempt += 1) {
    accessCode = generateOrganizationAccessCode();

    try {
      await prisma.$transaction(async (tx) => {
        await tx.organization.update({
          where: { id: organization.id },
          data: {
            accessCodeHash: hashOrganizationAccessCode(accessCode),
            accessCodeCiphertext: encryptOrganizationCredential(accessCode),
            accessCodeEnabled: true,
            accessCodeUpdatedAt: new Date()
          }
        });
        await tx.organizationAuditEvent.create({
          data: {
            organizationId: organization.id,
            actorMembershipId: membership.id,
            action: wasConfigured
              ? OrganizationAuditAction.ACCESS_CODE_ROTATED
              : OrganizationAuditAction.ACCESS_CODE_GENERATED
          }
        });
      });
      break;
    } catch (error) {
      if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== "P2002" || attempt === 2) {
        throw error;
      }
    }
  }

  refreshPolicyPages(slug);
  return {
    success: "A new organization code was generated. The previous code no longer works."
  };
}

export async function disableOrganizationAccessCode(
  _state: OrganizationPolicyState,
  formData: FormData
): Promise<OrganizationPolicyState> {
  const slug = slugSchema.parse(value(formData, "organizationSlug"));
  const { organization, membership } = await requireOrganizationOwner(slug);

  await prisma.$transaction(async (tx) => {
    await tx.organization.update({
      where: { id: organization.id },
      data: {
        accessCodeHash: null,
        accessCodeCiphertext: null,
        accessCodeEnabled: false,
        accessCodeUpdatedAt: new Date()
      }
    });
    await tx.organizationAuditEvent.create({
      data: {
        organizationId: organization.id,
        actorMembershipId: membership.id,
        action: OrganizationAuditAction.ACCESS_CODE_DISABLED
      }
    });
  });

  refreshPolicyPages(slug);
  return { success: "The organization code was disabled." };
}
