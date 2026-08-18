import { prisma } from "@/lib/prisma";
import { ensureCurrentSeason } from "@/lib/fixed-seasons";
import { withEffectivePositions } from "@/lib/ladder-positions";
import { matchFeedOrderBy } from "@/lib/match-feed";
import { buildTeamStandings } from "@/lib/team-standings";

export async function getActiveSeason(organizationId: string) {
  return prisma.$transaction(async (tx) => {
    return ensureCurrentSeason(tx, organizationId);
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

  // Rows stay in display order; the position rides along so the pages and the
  // challenge validation read the same tied standings.
  return withEffectivePositions(
    players.map((player) => {
      const winCount = wins.get(player.userId) ?? 0;
      const lossCount = losses.get(player.userId) ?? 0;

      return {
        ...player,
        user: { ...player.user, team: player.membership.team },
        wins: winCount,
        losses: lossCount,
        matchesPlayed: winCount + lossCount
      };
    })
  );
}

export async function getTeamLadder(seasonId: string) {
  const ladder = await getLadder(seasonId);
  const organizationId = ladder[0]?.organizationId;

  if (!organizationId) {
    return [];
  }

  const [matches, memberships] = await Promise.all([
    prisma.match.findMany({
      where: { seasonId, organizationId },
      select: {
        winnerId: true,
        loserId: true,
        winnerPointsBefore: true,
        winnerPointsAfter: true,
        loserPointsBefore: true,
        loserPointsAfter: true
      }
    }),
    prisma.membership.findMany({
      where: { organizationId },
      select: { userId: true, teamId: true }
    })
  ]);

  return buildTeamStandings({
    players: ladder.map((entry) => ({
      userId: entry.userId,
      points: entry.points,
      team: entry.user.team
    })),
    matches,
    teamIdByUserId: new Map(memberships.map((membership) => [membership.userId, membership.teamId]))
  });
}

/**
 * Every registered match for a player, across all seasons, in one query so the
 * profile can derive all-time, seasonal and head-to-head statistics without
 * querying per opponent.
 */
export async function getPlayerMatches(userId: string, organizationId: string) {
  return prisma.match.findMany({
    where: {
      organizationId,
      OR: [{ winnerId: userId }, { loserId: userId }],
      season: { organizationId }
    },
    include: { winner: true, loser: true },
    orderBy: matchFeedOrderBy
  });
}

export async function getUsers(organizationId: string) {
  return prisma.user.findMany({
    where: {
      memberships: {
        some: { organizationId, status: "ACTIVE" }
      }
    },
    include: { memberships: { where: { organizationId }, include: { team: true } } },
    orderBy: { username: "asc" }
  }).then((users) => users.map((user) => ({ ...user, team: user.memberships[0]?.team ?? null })));
}
