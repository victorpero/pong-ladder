import { prisma } from "@/lib/prisma";
import { ensureCurrentSeason } from "@/lib/fixed-seasons";
import { matchFeedOrderBy } from "@/lib/match-feed";
import { getDefaultOrganization } from "@/lib/organizations";

export async function getActiveSeason(organizationId?: string) {
  return prisma.$transaction(async (tx) => {
    const resolvedOrganizationId = organizationId ?? (await getDefaultOrganization(tx)).id;
    return ensureCurrentSeason(tx, resolvedOrganizationId);
  });
}

export async function getLadder(seasonId: string) {
  const players = await prisma.seasonPlayer.findMany({
    where: {
      seasonId,
      membership: { status: "ACTIVE" }
    },
    include: {
      user: {
        select: { id: true, username: true, fullName: true, email: true, createdAt: true, updatedAt: true }
      },
      membership: { include: { team: true } }
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
      user: { ...player.user, team: player.membership.team },
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

/**
 * Every registered match for a player, across all seasons, in one query so the
 * profile can derive all-time, seasonal and head-to-head statistics without
 * querying per opponent.
 */
export async function getPlayerMatches(userId: string, organizationId?: string) {
  const resolvedOrganizationId = organizationId ?? (await getDefaultOrganization(prisma)).id;

  return prisma.match.findMany({
    where: {
      organizationId: resolvedOrganizationId,
      OR: [{ winnerId: userId }, { loserId: userId }],
      season: { organizationId: resolvedOrganizationId }
    },
    include: { winner: true, loser: true },
    orderBy: matchFeedOrderBy
  });
}

export async function getUsers(organizationId?: string) {
  const resolvedOrganizationId = organizationId ?? (await getDefaultOrganization(prisma)).id;

  return prisma.user.findMany({
    where: {
      memberships: {
        some: { organizationId: resolvedOrganizationId, status: "ACTIVE" }
      }
    },
    include: { memberships: { where: { organizationId: resolvedOrganizationId }, include: { team: true } } },
    orderBy: { username: "asc" }
  }).then((users) => users.map((user) => ({ ...user, team: user.memberships[0]?.team ?? null })));
}
