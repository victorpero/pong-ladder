import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { SESSION_COOKIE_NAME, verifySessionToken } from "@/lib/session";

export const awaitingApprovalPath = "/awaiting-approval";

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
      email: true,
      isAdmin: true,
      isApproved: true
    }
  });

  if (!user) {
    return null;
  }

  return { session, user };
}

export async function requireAuthenticatedUser(nextPath: string) {
  const sessionUser = await getSessionUser();

  if (!sessionUser) {
    redirect(`/login?next=${nextPath}`);
  }

  return sessionUser;
}

export async function requireActiveUser(nextPath: string) {
  const sessionUser = await requireAuthenticatedUser(nextPath);

  if (!sessionUser.user.isApproved && !sessionUser.user.isAdmin) {
    redirect(awaitingApprovalPath);
  }

  return sessionUser;
}

export async function requireAdminUser() {
  const sessionUser = await requireAuthenticatedUser("/admin");

  if (!sessionUser.user.isAdmin) {
    throw new Error("Admin access required.");
  }

  return sessionUser;
}
