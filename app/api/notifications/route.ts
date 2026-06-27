import { ChallengeStatus } from "@prisma/client";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getPublicPlayerName } from "@/lib/display-name";
import { prisma } from "@/lib/prisma";
import { SESSION_COOKIE_NAME, verifySessionToken } from "@/lib/session";

export async function GET() {
  const session = await verifySessionToken(cookies().get(SESSION_COOKIE_NAME)?.value);

  if (!session) {
    return NextResponse.json({ pendingChallenges: 0, challenges: [] }, { status: 401 });
  }

  const where = {
    challengedId: session.sub,
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
