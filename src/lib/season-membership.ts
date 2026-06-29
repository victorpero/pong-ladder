import type { Prisma } from "@prisma/client";
import { ensureCurrentSeason } from "@/lib/fixed-seasons";

export async function joinActiveSeasonForUser(tx: Prisma.TransactionClient, userId: string) {
  const season = await ensureCurrentSeason(tx);

  const existing = await tx.seasonPlayer.findUnique({
    where: {
      seasonId_userId: {
        seasonId: season.id,
        userId
      }
    }
  });

  if (existing) {
    return existing;
  }

  const count = await tx.seasonPlayer.count({
    where: { seasonId: season.id }
  });

  return tx.seasonPlayer.create({
    data: {
      seasonId: season.id,
      userId,
      points: 0,
      currentRank: count + 1
    }
  });
}
