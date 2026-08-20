"use server";

import {
  MembershipJoinMethod,
  MembershipStatus,
  Prisma
} from "@prisma/client";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireAuthenticatedUser, verifyEmailPath } from "@/lib/authz";
import { hashOrganizationAccessCode, normalizeOrganizationAccessCode } from "@/lib/organization-access-code";
import { evaluateOrganizationJoinPolicy } from "@/lib/organization-join-policy";
import { t } from "@/lib/i18n/format";
import { getRequestDictionary, getRequestLocale } from "@/lib/i18n/server";
import { organizationsPath } from "@/lib/organization-paths";
import { revalidateOrganizationSelection } from "@/lib/revalidation";
import { prisma } from "@/lib/prisma";
import { consumeRateLimit, getClientRateLimitKey, RateLimitError } from "@/lib/rate-limit";

export type OrganizationJoinState = {
  outcome?:
    | "active"
    | "pending"
    | "already_member"
    | "rejected"
    | "suspended"
    | "removed"
    | "invalid_code"
    | "invitation_required"
    | "domain_not_allowed"
    | "access_code_required"
    | "rate_limited";
  message?: string;
  organizationSlug?: string;
};

const organizationIdSchema = z.string().min(1).max(100);

async function requireVerifiedJoinUser() {
  const locale = getRequestLocale();
  const selectionPath = organizationsPath(locale);
  const sessionUser = await requireAuthenticatedUser(selectionPath);

  if (!sessionUser.user.emailVerifiedAt) {
    redirect(`${verifyEmailPath(locale)}?next=${encodeURIComponent(selectionPath)}`);
  }

  return sessionUser;
}

export async function joinOrganizationByPolicy(
  _state: OrganizationJoinState,
  formData: FormData
): Promise<OrganizationJoinState> {
  const sessionUser = await requireVerifiedJoinUser();
  const organizationId = organizationIdSchema.parse(formData.get("organizationId")?.toString() ?? "");
  const organization = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: { id: true, name: true, joinPolicy: true, allowedEmailDomains: true }
  });

  if (!organization) {
    return {
      outcome: "access_code_required",
      message: getRequestDictionary().actions.join.organizationUnavailable
    };
  }

  const decision = evaluateOrganizationJoinPolicy({
    policy: organization.joinPolicy,
    verifiedEmail: sessionUser.user.email,
    allowedEmailDomains: organization.allowedEmailDomains
  });

  if (!decision.allowed) {
    return policyDeniedState(decision.outcome);
  }

  const result = await createOrUpdateMembership({
    userId: sessionUser.user.id,
    organizationId: organization.id,
    status: decision.status,
    joinMethod: decision.joinMethod
  });

  revalidateOrganizationSelection();
  return membershipState(result, organization.name);
}

export async function joinOrganizationWithAccessCode(
  _state: OrganizationJoinState,
  formData: FormData
): Promise<OrganizationJoinState> {
  const sessionUser = await requireVerifiedJoinUser();

  try {
    consumeRateLimit(`organization-code:account:${sessionUser.user.id}`, 8, 15 * 60 * 1000);
    consumeRateLimit(getClientRateLimitKey("organization-code:client"), 20, 15 * 60 * 1000);
  } catch (error) {
    if (error instanceof RateLimitError) {
      return { outcome: "rate_limited", message: getRequestDictionary().actions.rateLimited };
    }

    throw error;
  }

  const normalizedCode = normalizeOrganizationAccessCode(formData.get("accessCode")?.toString() ?? "");

  if (!/^[23456789ABCDEFGHJKLMNPQRSTUVWXYZ]{12}$/.test(normalizedCode)) {
    return invalidCodeState();
  }

  const accessCodeHash = hashOrganizationAccessCode(normalizedCode);
  const organization = await prisma.organization.findFirst({
    where: {
      accessCodeHash,
      accessCodeEnabled: true
    },
    select: { id: true, name: true, slug: true }
  });

  if (!organization) {
    return invalidCodeState();
  }

  const result = await createOrUpdateMembership({
    userId: sessionUser.user.id,
    organizationId: organization.id,
    status: MembershipStatus.ACTIVE,
    joinMethod: MembershipJoinMethod.ACCESS_CODE
  });

  revalidateOrganizationSelection();
  return membershipState(result, organization.name, organization.slug);
}

type MembershipResult = MembershipStatus | "ALREADY_MEMBER";

async function createOrUpdateMembership(input: {
  userId: string;
  organizationId: string;
  status: MembershipStatus;
  joinMethod: MembershipJoinMethod;
}): Promise<MembershipResult> {
  try {
    return await prisma.$transaction(async (tx) => {
      const existing = await tx.membership.findUnique({
        where: {
          userId_organizationId: { userId: input.userId, organizationId: input.organizationId }
        },
        select: { id: true, status: true }
      });

      if (existing?.status === MembershipStatus.ACTIVE) {
        return "ALREADY_MEMBER";
      }

      if (
        existing?.status === MembershipStatus.REJECTED ||
        existing?.status === MembershipStatus.SUSPENDED ||
        existing?.status === MembershipStatus.REMOVED
      ) {
        return existing.status;
      }

      if (existing) {
        const membership = await tx.membership.update({
          where: { id: existing.id },
          data: {
            status: input.status,
            joinMethod: input.joinMethod,
            activatedAt: input.status === MembershipStatus.ACTIVE ? new Date() : null,
            reviewedAt: null,
            reviewedById: null
          },
          select: { status: true }
        });

        return membership.status;
      }

      const membership = await tx.membership.create({
        data: {
          userId: input.userId,
          organizationId: input.organizationId,
          status: input.status,
          joinMethod: input.joinMethod,
          activatedAt: input.status === MembershipStatus.ACTIVE ? new Date() : null
        },
        select: { status: true }
      });

      return membership.status;
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      const existing = await prisma.membership.findUnique({
        where: { userId_organizationId: { userId: input.userId, organizationId: input.organizationId } },
        select: { status: true }
      });

      if (!existing) {
        throw error;
      }

      return existing.status === MembershipStatus.ACTIVE ? "ALREADY_MEMBER" : existing.status;
    }

    throw error;
  }
}

function membershipState(
  result: MembershipResult,
  organizationName: string,
  organizationSlug?: string
): OrganizationJoinState {
  const messages = getRequestDictionary().actions.join;
  const organization = { organization: organizationName };

  switch (result) {
    case "ALREADY_MEMBER":
      return {
        outcome: "already_member",
        message: t(messages.alreadyMember, organization),
        organizationSlug
      };
    case MembershipStatus.ACTIVE:
      return { outcome: "active", message: t(messages.ready, organization), organizationSlug };
    case MembershipStatus.PENDING:
      return { outcome: "pending", message: t(messages.pending, organization) };
    case MembershipStatus.REJECTED:
      return { outcome: "rejected", message: t(messages.rejected, organization) };
    case MembershipStatus.SUSPENDED:
      return { outcome: "suspended", message: t(messages.suspended, organization) };
    case MembershipStatus.REMOVED:
      return { outcome: "removed", message: t(messages.removed, organization) };
  }
}

function policyDeniedState(outcome: "invitation_required" | "domain_not_allowed" | "access_code_required") {
  const join = getRequestDictionary().actions.join;
  const messages = {
    invitation_required: join.invitationRequired,
    domain_not_allowed: join.domainNotAllowed,
    access_code_required: join.accessCodeRequired
  };

  return { outcome, message: messages[outcome] };
}

function invalidCodeState(): OrganizationJoinState {
  return {
    outcome: "invalid_code",
    message: getRequestDictionary().actions.join.invalidCode
  };
}
