import { prisma } from "@/lib/prisma";
import { ensureCurrentSeason } from "@/lib/fixed-seasons";

export async function getActiveSeason() {
  return prisma.$transaction((tx) => ensureCurrentSeason(tx));
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

export async function getTeamLadder(seasonId: string) {
  const ladder = await getLadder(seasonId);
  const teams = new Map<
    string,
    {
      id: string;
      name: string;
      points: number;
      wins: number;
      losses: number;
      matchesPlayed: number;
      players: number;
    }
  >();

  for (const entry of ladder) {
    if (!entry.user.team) {
      continue;
    }

    const current = teams.get(entry.user.team.id) ?? {
      id: entry.user.team.id,
      name: entry.user.team.name,
      points: 0,
      wins: 0,
      losses: 0,
      matchesPlayed: 0,
      players: 0
    };

    current.points += entry.points;
    current.wins += entry.wins;
    current.losses += entry.losses;
    current.matchesPlayed += entry.matchesPlayed;
    current.players += 1;
    teams.set(current.id, current);
  }

  return Array.from(teams.values())
    .sort((left, right) => right.points - left.points || left.name.localeCompare(right.name))
    .map((team, index) => ({
      ...team,
      currentRank: index + 1
    }));
}

export async function getUsers() {
  return prisma.user.findMany({
    include: { team: true },
    orderBy: { username: "asc" }
  });
}
