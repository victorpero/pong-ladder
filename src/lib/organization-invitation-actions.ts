"use server";

import { Prisma } from "@prisma/client";
import { cookies } from "next/headers";
import { z } from "zod";
import { getAppBaseUrl } from "@/lib/app-url";
import { getSessionUser, requireOrganizationAdmin } from "@/lib/authz";
import {
  generateOrganizationInvitationToken,
  hashOrganizationInvitationToken,
  redeemOrganizationInvitation,
  redeemOrganizationInvitationById,
  type InvitationRedemptionResult
} from "@/lib/organization-invitation";
import { getRequestDictionary } from "@/lib/i18n/server";
import {
  clearedPendingInvitationCookie,
  PENDING_INVITATION_COOKIE,
  readPendingInvitation
} from "@/lib/pending-invitation";
import { revalidateOrganizationSections, revalidateOrganizationSelection } from "@/lib/revalidation";
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

export type ResumeInvitationState = RedeemInvitationState | { outcome: "none" };

function value(formData: FormData, key: string) {
  return formData.get(key)?.toString() ?? "";
}

function refreshInvitationPages(organizationSlug: string) {
  revalidateOrganizationSelection();
  revalidateOrganizationSections(organizationSlug, ["admin"]);
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
    return { error: getRequestDictionary().actions.organizationInvitation.checkSettings };
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
        success: getRequestDictionary().actions.organizationInvitation.created,
        invitationUrl: `${getAppBaseUrl()}/join/${token}`
      };
    } catch (error) {
      if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== "P2002" || attempt === 2) {
        throw error;
      }
    }
  }

  return { error: getRequestDictionary().actions.organizationInvitation.failed };
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
    forgetPendingInvitation();
  }

  return redemption;
}

export async function resumePendingInvitationAction(): Promise<ResumeInvitationState> {
  const invitationId = readPendingInvitation(cookies().get(PENDING_INVITATION_COOKIE)?.value);

  if (!invitationId) {
    forgetPendingInvitation();
    return { outcome: "none" };
  }

  const sessionUser = await getSessionUser();

  if (!sessionUser) {
    return { outcome: "authentication_required" };
  }

  if (!sessionUser.user.emailVerifiedAt) {
    return { outcome: "verification_required" };
  }

  const redemption = await redeemOrganizationInvitationById(invitationId, sessionUser.user.id);
  forgetPendingInvitation();

  if (redemption.outcome === "redeemed" || redemption.outcome === "already_member") {
    refreshInvitationPages(redemption.organizationSlug);
  }

  return redemption;
}

function forgetPendingInvitation() {
  const cleared = clearedPendingInvitationCookie();
  cookies().set(cleared.name, cleared.value, cleared.options);
}
