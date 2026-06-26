import { prisma } from "@/lib/prisma";

export async function getActiveSeason() {
  return prisma.season.findFirst({
    where: { isActive: true },
    orderBy: { startsAt: "desc" }
  });
}

export async function getLadder(seasonId: string) {
  const players = await prisma.seasonPlayer.findMany({
    where: { seasonId },
    include: {
      user: {
        include: { team: true }
      }
    },
    orderBy: [{ currentRank: "asc" }]
  });

  const matchCounts = await prisma.match.groupBy({
    by: ["winnerId"],
    where: { seasonId },
    _count: { winnerId: true }
  });

  const lossCounts = await prisma.match.groupBy({
    by: ["loserId"],
    where: { seasonId },
    _count: { loserId: true }
  });

  const wins = new Map(matchCounts.map((item) => [item.winnerId, item._count.winnerId]));
  const losses = new Map(lossCounts.map((item) => [item.loserId, item._count.loserId]));

  return players.map((player) => {
    const winCount = wins.get(player.userId) ?? 0;
    const lossCount = losses.get(player.userId) ?? 0;

    return {
      ...player,
      wins: winCount,
      losses: lossCount,
      matchesPlayed: winCount + lossCount
    };
  });
}

export async function getSeasonOptions() {
  return prisma.season.findMany({
    orderBy: [{ isActive: "desc" }, { year: "desc" }]
  });
}

export async function getUsers() {
  return prisma.user.findMany({
    include: { team: true },
    orderBy: { username: "asc" }
  });
}
