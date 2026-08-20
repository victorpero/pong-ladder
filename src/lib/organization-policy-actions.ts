"use server";

import {
  OrganizationAuditAction,
  OrganizationJoinPolicy,
  OrganizationType,
  OrganizationVisibility,
  Prisma
} from "@prisma/client";
import { z } from "zod";
import { requireOrganizationAdmin, requireOrganizationOwner } from "@/lib/authz";
import { generateOrganizationAccessCode, hashOrganizationAccessCode } from "@/lib/organization-access-code";
import { encryptOrganizationCredential } from "@/lib/organization-credential";
import { normalizeEmailDomains } from "@/lib/organization-domain";
import { SUPPORTED_LOCALES } from "@/lib/i18n/config";
import { getRequestDictionary } from "@/lib/i18n/server";
import { prisma } from "@/lib/prisma";
import { revalidateOrganizationSections, revalidateOrganizationSelection } from "@/lib/revalidation";

export type OrganizationPolicyState = {
  error?: string;
  success?: string;
};

const slugSchema = z.string().trim().min(1).max(100).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
const policySchema = z.nativeEnum(OrganizationJoinPolicy);
const detailsSchema = z.object({
  name: z.string().trim().min(2).max(100),
  type: z.nativeEnum(OrganizationType),
  visibility: z.nativeEnum(OrganizationVisibility),
  defaultLocale: z.enum(SUPPORTED_LOCALES)
});

function value(formData: FormData, key: string) {
  return formData.get(key)?.toString() ?? "";
}

function refreshPolicyPages(slug: string) {
  revalidateOrganizationSelection();
  revalidateOrganizationSections(slug, ["admin", "invite"]);
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
    return { error: getRequestDictionary().actions.organizationPolicy.domainRequired };
  }

  if (rawDomains.length !== allowedEmailDomains.length) {
    return { error: getRequestDictionary().actions.organizationPolicy.domainInvalid };
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
  return { success: getRequestDictionary().actions.organizationPolicy.policyUpdated };
}

export async function updateOrganizationDetails(
  _state: OrganizationPolicyState,
  formData: FormData
): Promise<OrganizationPolicyState> {
  const slug = slugSchema.parse(value(formData, "organizationSlug"));
  const parsed = detailsSchema.safeParse({
    name: value(formData, "name"),
    type: value(formData, "type"),
    visibility: value(formData, "visibility"),
    defaultLocale: value(formData, "defaultLocale")
  });

  if (!parsed.success) {
    return { error: getRequestDictionary().actions.organizationPolicy.detailsInvalid };
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
  return { success: getRequestDictionary().actions.organizationPolicy.settingsUpdated };
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
  return { success: getRequestDictionary().actions.organizationPolicy.codeGenerated };
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
  return { success: getRequestDictionary().actions.organizationPolicy.codeDisabled };
}
