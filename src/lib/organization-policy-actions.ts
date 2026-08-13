"use server";

import { OrganizationJoinPolicy, Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireOrganizationOwner } from "@/lib/authz";
import { generateOrganizationAccessCode, hashOrganizationAccessCode } from "@/lib/organization-access-code";
import { normalizeEmailDomains } from "@/lib/organization-domain";
import { organizationPath, organizationsPath } from "@/lib/organization-paths";
import { prisma } from "@/lib/prisma";

export type OrganizationPolicyState = {
  error?: string;
  success?: string;
  accessCode?: string;
};

const slugSchema = z.string().trim().min(1).max(100).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
const policySchema = z.nativeEnum(OrganizationJoinPolicy);

function value(formData: FormData, key: string) {
  return formData.get(key)?.toString() ?? "";
}

function refreshPolicyPages(slug: string) {
  revalidatePath(organizationsPath);
  revalidatePath(organizationPath(slug, "admin"));
}

export async function updateOrganizationJoinPolicy(
  _state: OrganizationPolicyState,
  formData: FormData
): Promise<OrganizationPolicyState> {
  const slug = slugSchema.parse(value(formData, "organizationSlug"));
  const policy = policySchema.parse(value(formData, "joinPolicy"));
  const { organization } = await requireOrganizationOwner(slug);
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

  await prisma.organization.update({
    where: { id: organization.id },
    data: {
      joinPolicy: policy,
      allowedEmailDomains,
      ...(policy === OrganizationJoinPolicy.ACCESS_CODE ? {} : { accessCodeEnabled: false })
    }
  });

  refreshPolicyPages(slug);
  return { success: "Join policy updated." };
}

export async function rotateOrganizationAccessCode(
  _state: OrganizationPolicyState,
  formData: FormData
): Promise<OrganizationPolicyState> {
  const slug = slugSchema.parse(value(formData, "organizationSlug"));
  const { organization } = await requireOrganizationOwner(slug);
  let accessCode = "";

  for (let attempt = 0; attempt < 3; attempt += 1) {
    accessCode = generateOrganizationAccessCode();

    try {
      await prisma.organization.update({
        where: { id: organization.id },
        data: {
          accessCodeHash: hashOrganizationAccessCode(accessCode),
          accessCodeEnabled: true,
          accessCodeUpdatedAt: new Date()
        }
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
    success: "A new organization code was generated. The previous code no longer works.",
    accessCode
  };
}

export async function disableOrganizationAccessCode(
  _state: OrganizationPolicyState,
  formData: FormData
): Promise<OrganizationPolicyState> {
  const slug = slugSchema.parse(value(formData, "organizationSlug"));
  const { organization } = await requireOrganizationOwner(slug);

  await prisma.organization.update({
    where: { id: organization.id },
    data: { accessCodeHash: null, accessCodeEnabled: false, accessCodeUpdatedAt: new Date() }
  });

  refreshPolicyPages(slug);
  return { success: "The organization code was disabled." };
}
