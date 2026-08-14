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

  const season = await tx.season.findUnique({
    where: { id: seasonId },
    select: { organizationId: true }
  });

  if (!season) {
    throw new Error("That season does not exist.");
  }

  const membership = await tx.membership.findUnique({
    where: {
      userId_organizationId: {
        userId,
        organizationId: season.organizationId
      }
    },
    select: { id: true }
  });

  if (!membership) {
    throw new Error("The player must belong to the season's organization.");
  }

  const positions = await tx.seasonPlayer.aggregate({
    where: { seasonId },
    _max: { currentRank: true }
  });

  const seasonPlayer = await tx.seasonPlayer.create({
    data: {
      seasonId,
      organizationId: season.organizationId,
      membershipId: membership.id,
      userId,
      points: 0,
      currentRank: nextLadderPosition(positions._max.currentRank)
    }
  });

  return { created: true, seasonPlayer };
}

export async function joinActiveSeasonForUser(tx: Prisma.TransactionClient, organizationId: string, userId: string) {
  const season = await ensureCurrentSeason(tx, organizationId);
  const { seasonPlayer } = await addPlayerToSeason(tx, season.id, userId);

  return seasonPlayer;
}
