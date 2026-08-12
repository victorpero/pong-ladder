import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { getDefaultOrganization } from "@/lib/organizations";
import { consumeRateLimit, getClientRateLimitKey, RateLimitError } from "@/lib/rate-limit";

export async function GET() {
  try {
    consumeRateLimit(getClientRateLimitKey("api:session"), 120, 60 * 1000);
  } catch (error) {
    if (error instanceof RateLimitError) {
      return NextResponse.json({ error: error.message }, { status: 429 });
    }

    throw error;
  }

  const sessionUser = await getSessionUser();

  if (!sessionUser) {
    return NextResponse.json({ isAdmin: false }, { status: 401 });
  }

  const organization = await getDefaultOrganization(prisma);
  const membership = await prisma.membership.findUnique({
    where: { userId_organizationId: { userId: sessionUser.user.id, organizationId: organization.id } },
    select: { role: true, status: true }
  });

  return NextResponse.json({
    isAdmin:
      Boolean(sessionUser.user.emailVerifiedAt) &&
      membership?.status === "ACTIVE" &&
      (membership.role === "ADMIN" || membership.role === "OWNER"),
    isApproved: Boolean(sessionUser.user.emailVerifiedAt) && membership?.status === "ACTIVE"
  });
}
