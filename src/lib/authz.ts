import { MembershipRole, MembershipStatus } from "@prisma/client";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getDefaultOrganization } from "@/lib/organizations";
import { prisma } from "@/lib/prisma";
import { SESSION_COOKIE_NAME, verifySessionToken } from "@/lib/session";

export const awaitingApprovalPath = "/awaiting-approval";

export class OrganizationAccessError extends Error {
  constructor(message = "Organization access required.") {
    super(message);
    this.name = "OrganizationAccessError";
  }
}

export async function getSessionUser() {
  const session = await verifySessionToken(cookies().get(SESSION_COOKIE_NAME)?.value);

  if (!session) {
    return null;
  }

  const user = await prisma.user.findUnique({
    where: { id: session.sub },
    select: {
      id: true,
      username: true,
      email: true
    }
  });

  return user ? { session, user } : null;
}

export async function requireActiveMembership(userId: string, organizationId: string) {
  const membership = await prisma.membership.findUnique({
    where: {
      userId_organizationId: {
        userId,
        organizationId
      }
    },
    include: { organization: true }
  });

  if (!membership || membership.status !== MembershipStatus.ACTIVE) {
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

export async function requireAdminUser(organizationId?: string) {
  const sessionUser = await requireAuthenticatedUser("/admin");
  const organization = organizationId
    ? await prisma.organization.findUnique({ where: { id: organizationId } })
    : await getDefaultOrganization(prisma);

  if (!organization) {
    throw new OrganizationAccessError();
  }

  const membership = await requireOrgAdmin(sessionUser.user.id, organization.id);
  return { ...sessionUser, organization, membership };
}
