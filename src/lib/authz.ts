import { MembershipRole, MembershipStatus } from "@prisma/client";
import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { organizationPath } from "@/lib/organization-paths";
import { getDefaultOrganization } from "@/lib/organizations";
import { prisma } from "@/lib/prisma";
import type { SessionPayload } from "@/lib/session";

export const awaitingApprovalPath = "/awaiting-approval";
export const verifyEmailPath = "/verify-email";

export class OrganizationAccessError extends Error {
  constructor(message = "Organization access required.") {
    super(message);
    this.name = "OrganizationAccessError";
  }
}

export async function getSessionUser() {
  const authSession = await auth.api.getSession({ headers: await headers() });

  if (!authSession) {
    return null;
  }

  const user = await prisma.user.findUnique({
    where: { id: authSession.user.id },
    select: {
      id: true,
      username: true,
      email: true,
      emailVerifiedAt: true
    }
  });

  if (!user) {
    return null;
  }

  const session: SessionPayload = {
    sub: user.id,
    username: user.username,
    email: user.email,
    iat: Math.floor(authSession.session.createdAt.getTime() / 1000),
    exp: Math.floor(authSession.session.expiresAt.getTime() / 1000)
  };

  return { session, user };
}

export async function requireActiveMembership(userId: string, organizationId: string) {
  const membership = await prisma.membership.findUnique({
    where: {
      userId_organizationId: {
        userId,
        organizationId
      }
    },
    include: {
      organization: true,
      user: { select: { emailVerifiedAt: true } }
    }
  });

  if (!membership || membership.status !== MembershipStatus.ACTIVE || !membership.user.emailVerifiedAt) {
    throw new OrganizationAccessError();
  }

  return membership;
}

export async function requireOrgAdmin(userId: string, organizationId: string) {
  const membership = await requireActiveMembership(userId, organizationId);

  if (membership.role !== MembershipRole.OWNER && membership.role !== MembershipRole.ADMIN) {
    throw new OrganizationAccessError("Organization administrator access required.");
  }

  return membership;
}

export async function requireOrgOwner(userId: string, organizationId: string) {
  const membership = await requireActiveMembership(userId, organizationId);

  if (membership.role !== MembershipRole.OWNER) {
    throw new OrganizationAccessError("Organization owner access required.");
  }

  return membership;
}

export async function requireAuthenticatedUser(nextPath: string) {
  const sessionUser = await getSessionUser();

  if (!sessionUser) {
    redirect(`/login?next=${nextPath}`);
  }

  return sessionUser;
}

export async function requireActiveUser(nextPath: string, organizationId?: string) {
  const sessionUser = await requireAuthenticatedUser(nextPath);

  if (!sessionUser.user.emailVerifiedAt) {
    redirect(`${verifyEmailPath}?next=${encodeURIComponent(nextPath)}`);
  }

  const organization = organizationId
    ? await prisma.organization.findUnique({ where: { id: organizationId } })
    : await getDefaultOrganization(prisma);

  if (!organization) {
    throw new OrganizationAccessError();
  }

  try {
    const membership = await requireActiveMembership(sessionUser.user.id, organization.id);
    return { ...sessionUser, organization, membership };
  } catch (error) {
    if (error instanceof OrganizationAccessError) {
      redirect(awaitingApprovalPath);
    }

    throw error;
  }
}

export async function requireOrganizationUser(organizationSlug: string, nextPath = organizationPath(organizationSlug)) {
  const sessionUser = await requireAuthenticatedUser(nextPath);

  if (!sessionUser.user.emailVerifiedAt) {
    redirect(`${verifyEmailPath}?next=${encodeURIComponent(nextPath)}`);
  }

  const membership = await prisma.membership.findFirst({
    where: {
      userId: sessionUser.user.id,
      status: MembershipStatus.ACTIVE,
      organization: { slug: organizationSlug }
    },
    include: { organization: true }
  });

  if (!membership) {
    notFound();
  }

  return { ...sessionUser, organization: membership.organization, membership };
}

export async function requireOrganizationAdmin(
  organizationSlug: string,
  nextPath = organizationPath(organizationSlug, "admin")
) {
  const context = await requireOrganizationUser(organizationSlug, nextPath);

  if (context.membership.role !== MembershipRole.OWNER && context.membership.role !== MembershipRole.ADMIN) {
    notFound();
  }

  return context;
}

export async function requireAdminUser(organizationId?: string) {
  const sessionUser = await requireAuthenticatedUser("/admin");

  if (!sessionUser.user.emailVerifiedAt) {
    redirect(`${verifyEmailPath}?next=${encodeURIComponent("/admin")}`);
  }
  const organization = organizationId
    ? await prisma.organization.findUnique({ where: { id: organizationId } })
    : await getDefaultOrganization(prisma);

  if (!organization) {
    throw new OrganizationAccessError();
  }

  const membership = await requireOrgAdmin(sessionUser.user.id, organization.id);
  return { ...sessionUser, organization, membership };
}
