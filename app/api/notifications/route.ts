import { ChallengeStatus } from "@prisma/client";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { SESSION_COOKIE_NAME, verifySessionToken } from "@/lib/session";

export async function GET() {
  const session = await verifySessionToken(cookies().get(SESSION_COOKIE_NAME)?.value);

  if (!session) {
    return NextResponse.json({ pendingChallenges: 0 }, { status: 401 });
  }

  const pendingChallenges = await prisma.challenge.count({
    where: {
      challengedId: session.sub,
      status: ChallengeStatus.Pending
    }
  });

  return NextResponse.json({ pendingChallenges });
}

