import type { Prisma } from "@prisma/client";
import { ensureCurrentSeason } from "@/lib/fixed-seasons";

export const alreadyInSeasonMessage = "That player is already in this season.";

/**
 * Ladder positions are unique per season, so a new player is appended below the
 * lowest existing position instead of at `count + 1`, which would collide with
 * an existing position whenever ranks are not contiguous.
 */
export function nextLadderPosition(lowestLadderPosition: number | null) {
  return (lowestLadderPosition ?? 0) + 1;
}

export function selectSeasonJoinCandidates<T extends { id: string }>(users: T[], seasonMemberIds: Iterable<string>) {
  const members = new Set(seasonMemberIds);

  return users.filter((user) => !members.has(user.id));
}

export async function addPlayerToSeason(tx: Prisma.TransactionClient, seasonId: string, userId: string) {
  const existing = await tx.seasonPlayer.findUnique({
    where: {
      seasonId_userId: {
        seasonId,
        userId
      }
    }
  });

  if (existing) {
    return { created: false, seasonPlayer: existing };
  }

  const positions = await tx.seasonPlayer.aggregate({
    where: { seasonId },
    _max: { currentRank: true }
  });

  const seasonPlayer = await tx.seasonPlayer.create({
    data: {
      seasonId,
      userId,
      points: 0,
      currentRank: nextLadderPosition(positions._max.currentRank)
    }
  });

  return { created: true, seasonPlayer };
}

export async function joinActiveSeasonForUser(tx: Prisma.TransactionClient, userId: string) {
  const season = await ensureCurrentSeason(tx);
  const { seasonPlayer } = await addPlayerToSeason(tx, season.id, userId);

  return seasonPlayer;
}
