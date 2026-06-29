"use server";

import { ChallengeStatus, Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { recalculateRanks } from "@/lib/rankings";
import { calculateMatchScore } from "@/lib/scoring";
import { SESSION_COOKIE_NAME, verifySessionToken } from "@/lib/session";

const idSchema = z.string().min(1);

function value(formData: FormData, key: string) {
  return formData.get(key)?.toString() ?? "";
}

function refreshAdmin() {
  revalidatePath("/", "layout");
  revalidatePath("/admin");
  revalidatePath("/ladder");
  revalidatePath("/players");
  revalidatePath("/matches");
  revalidatePath("/challenges");
  revalidatePath("/teams");
  revalidatePath("/account");
}

async function requireAdmin() {
  const session = await verifySessionToken(cookies().get(SESSION_COOKIE_NAME)?.value);

  if (!session) {
    redirect("/login?next=/admin");
  }

  const user = await prisma.user.findUnique({
    where: { id: session.sub },
    select: { isAdmin: true }
  });

  if (!user?.isAdmin) {
    throw new Error("Admin access required.");
  }
}

async function rebuildSeasonStandings(tx: Prisma.TransactionClient, seasonId: string) {
  const players = await tx.seasonPlayer.findMany({
    where: { seasonId },
    orderBy: [{ joinedAt: "asc" }]
  });

  const points = new Map(players.map((player) => [player.userId, 0]));

  await Promise.all(
    players.map((player) =>
      tx.seasonPlayer.update({
        where: { id: player.id },
        data: { points: 0 }
      })
    )
  );

  const matches = await tx.match.findMany({
    where: { seasonId },
    orderBy: [{ playedAt: "asc" }, { createdAt: "asc" }]
  });

  for (const match of matches) {
    const winnerPointsBefore = points.get(match.winnerId);
    const loserPointsBefore = points.get(match.loserId);

    if (winnerPointsBefore === undefined || loserPointsBefore === undefined) {
      continue;
    }

    const score = calculateMatchScore({
      winnerPointsBefore,
      loserPointsBefore,
      winnerSets: 3,
      loserSets: match.loserSets as 0 | 1 | 2
    });

    points.set(match.winnerId, score.winnerPointsAfter);
    points.set(match.loserId, score.loserPointsAfter);

    await tx.match.update({
      where: { id: match.id },
      data: {
        winnerPointsBefore,
        loserPointsBefore,
        winnerPointsAfter: score.winnerPointsAfter,
        loserPointsAfter: score.loserPointsAfter
      }
    });
  }

  await Promise.all(
    players.map((player) =>
      tx.seasonPlayer.update({
        where: { id: player.id },
        data: { points: points.get(player.userId) ?? 0 }
      })
    )
  );

  await recalculateRanks(tx, seasonId);
}

export async function adminRemoveSeasonPlayer(formData: FormData) {
  await requireAdmin();
  const seasonPlayerId = idSchema.parse(value(formData, "seasonPlayerId"));

  await prisma.$transaction(async (tx) => {
    const seasonPlayer = await tx.seasonPlayer.findUnique({
      where: { id: seasonPlayerId },
      select: { id: true, seasonId: true, userId: true }
    });

    if (!seasonPlayer) {
      return;
    }

    await tx.match.deleteMany({
      where: {
        seasonId: seasonPlayer.seasonId,
        OR: [{ winnerId: seasonPlayer.userId }, { loserId: seasonPlayer.userId }]
      }
    });

    await tx.challenge.deleteMany({
      where: {
        seasonId: seasonPlayer.seasonId,
        OR: [{ challengerId: seasonPlayer.userId }, { challengedId: seasonPlayer.userId }]
      }
    });

    await tx.seasonPlayer.delete({
      where: { id: seasonPlayer.id }
    });

    await rebuildSeasonStandings(tx, seasonPlayer.seasonId);
  });

  refreshAdmin();
}

export async function adminDeleteMatch(formData: FormData) {
  await requireAdmin();
  const matchId = idSchema.parse(value(formData, "matchId"));

  await prisma.$transaction(async (tx) => {
    const match = await tx.match.findUnique({
      where: { id: matchId },
      select: { id: true, seasonId: true, challengeId: true }
    });

    if (!match) {
      return;
    }

    await tx.match.delete({
      where: { id: match.id }
    });

    if (match.challengeId) {
      await tx.challenge.update({
        where: { id: match.challengeId },
        data: {
          status: ChallengeStatus.Accepted,
          completedAt: null
        }
      });
    }

    await rebuildSeasonStandings(tx, match.seasonId);
  });

  refreshAdmin();
}

export async function adminDeleteChallenge(formData: FormData) {
  await requireAdmin();
  const challengeId = idSchema.parse(value(formData, "challengeId"));

  await prisma.$transaction(async (tx) => {
    const challenge = await tx.challenge.findUnique({
      where: { id: challengeId },
      select: {
        id: true,
        seasonId: true,
        match: {
          select: { id: true }
        }
      }
    });

    if (!challenge) {
      return;
    }

    if (challenge.match) {
      await tx.match.delete({
        where: { id: challenge.match.id }
      });
    }

    await tx.challenge.delete({
      where: { id: challenge.id }
    });

    if (challenge.match) {
      await rebuildSeasonStandings(tx, challenge.seasonId);
    }
  });

  refreshAdmin();
}
