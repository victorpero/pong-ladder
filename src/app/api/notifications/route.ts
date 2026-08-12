import { ChallengeStatus } from "@prisma/client";
import { NextResponse } from "next/server";
import { getSessionUser, requireActiveMembership } from "@/lib/authz";
import { getPublicPlayerName } from "@/lib/display-name";
import { getDefaultOrganization } from "@/lib/organizations";
import { prisma } from "@/lib/prisma";
import { consumeRateLimit, getClientRateLimitKey, RateLimitError } from "@/lib/rate-limit";

export async function GET() {
  try {
    consumeRateLimit(getClientRateLimitKey("api:notifications"), 120, 60 * 1000);
  } catch (error) {
    if (error instanceof RateLimitError) {
      return NextResponse.json({ error: error.message }, { status: 429 });
    }

    throw error;
  }

  const sessionUser = await getSessionUser();

  if (!sessionUser) {
    return NextResponse.json({ pendingChallenges: 0, challenges: [] }, { status: 401 });
  }

  const organization = await getDefaultOrganization(prisma);
  try {
    await requireActiveMembership(sessionUser.user.id, organization.id);
  } catch {
    return NextResponse.json({ pendingChallenges: 0, challenges: [] }, { status: 403 });
  }

  const where = {
    organizationId: organization.id,
    challengedId: sessionUser.user.id,
    status: ChallengeStatus.Pending
  };

  const [pendingChallenges, challenges] = await Promise.all([
    prisma.challenge.count({
      where
    }),
    prisma.challenge.findMany({
      where,
      include: {
        challenger: true
      },
      orderBy: {
        createdAt: "desc"
      },
      take: 10
    })
  ]);

  return NextResponse.json({
    pendingChallenges,
    challenges: challenges.map((challenge) => ({
      id: challenge.id,
      challengerName: getPublicPlayerName(challenge.challenger)
    }))
  });
}
