"use server";

import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { z } from "zod";
import { getAppBaseUrl } from "@/lib/app-url";
import { getSessionUser, requireOrganizationAdmin } from "@/lib/authz";
import {
  generateOrganizationInvitationToken,
  hashOrganizationInvitationToken,
  redeemOrganizationInvitation,
  type InvitationRedemptionResult
} from "@/lib/organization-invitation";
import { organizationPath, organizationsPath } from "@/lib/organization-paths";
import { clearedPendingInvitationCookie } from "@/lib/pending-invitation";
import { prisma } from "@/lib/prisma";
import { consumeRateLimit, getClientRateLimitKey, RateLimitError } from "@/lib/rate-limit";

const slugSchema = z.string().trim().min(1).max(100).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
const idSchema = z.string().min(1);
const createInvitationSchema = z.object({
  expiresInHours: z.coerce.number().int().min(1).max(24 * 30),
  maxUses: z.preprocess(
    (input) => (input === "" || input === undefined ? null : input),
    z.coerce.number().int().min(1).max(1000).nullable()
  )
});

export type OrganizationInvitationState = {
  error?: string;
  success?: string;
  invitationUrl?: string;
};

export type RedeemInvitationState =
  | InvitationRedemptionResult
  | { outcome: "authentication_required" | "rate_limited" };

function value(formData: FormData, key: string) {
  return formData.get(key)?.toString() ?? "";
}

function refreshInvitationPages(organizationSlug: string) {
  revalidatePath(organizationsPath);
  revalidatePath(organizationPath(organizationSlug, "admin"));
}

export async function createOrganizationInvitation(
  _state: OrganizationInvitationState,
  formData: FormData
): Promise<OrganizationInvitationState> {
  const slug = slugSchema.parse(value(formData, "organizationSlug"));
  const { organization, membership } = await requireOrganizationAdmin(slug);
  const parsed = createInvitationSchema.safeParse({
    expiresInHours: value(formData, "expiresInHours"),
    maxUses: value(formData, "maxUses")
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check the invitation settings." };
  }

  const expiresAt = new Date(Date.now() + parsed.data.expiresInHours * 60 * 60 * 1000);

  for (let attempt = 0; attempt < 3; attempt += 1) {
    const token = generateOrganizationInvitationToken();

    try {
      await prisma.organizationInvitation.create({
        data: {
          organizationId: organization.id,
          creatorMembershipId: membership.id,
          tokenHash: hashOrganizationInvitationToken(token),
          expiresAt,
          maxUses: parsed.data.maxUses
        }
      });

      refreshInvitationPages(organization.slug);
      return {
        success: "Invitation created. Copy this link now; it will not be shown again.",
        invitationUrl: `${getAppBaseUrl()}/join/${token}`
      };
    } catch (error) {
      if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== "P2002" || attempt === 2) {
        throw error;
      }
    }
  }

  return { error: "The invitation could not be created. Try again." };
}

export async function revokeOrganizationInvitation(formData: FormData) {
  const slug = slugSchema.parse(value(formData, "organizationSlug"));
  const invitationId = idSchema.parse(value(formData, "invitationId"));
  const { organization } = await requireOrganizationAdmin(slug);

  await prisma.organizationInvitation.updateMany({
    where: { id: invitationId, organizationId: organization.id, revokedAt: null },
    data: { revokedAt: new Date() }
  });

  refreshInvitationPages(organization.slug);
}

export async function redeemOrganizationInvitationAction(token: string): Promise<RedeemInvitationState> {
  const sessionUser = await getSessionUser();

  if (!sessionUser) {
    return { outcome: "authentication_required" };
  }

  if (!sessionUser.user.emailVerifiedAt) {
    return { outcome: "verification_required" };
  }

  try {
    consumeRateLimit(
      getClientRateLimitKey("organization-invitation:redeem", sessionUser.user.id),
      30,
      5 * 60 * 1000
    );
  } catch (error) {
    if (error instanceof RateLimitError) {
      return { outcome: "rate_limited" };
    }

    throw error;
  }

  const redemption = await redeemOrganizationInvitation(token, sessionUser.user.id);

  if (redemption.outcome === "redeemed" || redemption.outcome === "already_member") {
    const cleared = clearedPendingInvitationCookie();
    cookies().set(cleared.name, cleared.value, cleared.options);
  }

  return redemption;
}
