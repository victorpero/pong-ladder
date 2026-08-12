import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getDefaultOrganization } from "@/lib/organizations";
import { consumeRateLimit, getClientRateLimitKey, RateLimitError } from "@/lib/rate-limit";
import { SESSION_COOKIE_NAME, verifySessionToken } from "@/lib/session";

export async function GET() {
  try {
    consumeRateLimit(getClientRateLimitKey("api:session"), 120, 60 * 1000);
  } catch (error) {
    if (error instanceof RateLimitError) {
      return NextResponse.json({ error: error.message }, { status: 429 });
    }

    throw error;
  }

  const session = await verifySessionToken(cookies().get(SESSION_COOKIE_NAME)?.value);

  if (!session) {
    return NextResponse.json({ isAdmin: false }, { status: 401 });
  }

  const organization = await getDefaultOrganization(prisma);
  const membership = await prisma.membership.findUnique({
    where: { userId_organizationId: { userId: session.sub, organizationId: organization.id } },
    select: { role: true, status: true }
  });

  return NextResponse.json({
    isAdmin: membership?.status === "ACTIVE" && (membership.role === "ADMIN" || membership.role === "OWNER"),
    isApproved: membership?.status === "ACTIVE"
  });
}
