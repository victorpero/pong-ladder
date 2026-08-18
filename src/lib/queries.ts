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

/**
 * Team standings come straight from the season's match rows, so they never mix a
 * player's live point total with the match history it was built from.
 */
export async function getTeamLadder(seasonId: string) {
  const season = await prisma.season.findUnique({
    where: { id: seasonId },
    select: { organizationId: true }
  });

  if (!season) {
    return [];
  }

  const [teams, players, matches] = await Promise.all([
    prisma.team.findMany({
      where: { organizationId: season.organizationId },
      select: { id: true, name: true }
    }),
    prisma.seasonPlayer.findMany({
      where: { seasonId, membership: { status: "ACTIVE" } },
      select: { userId: true, membership: { select: { teamId: true } } }
    }),
    prisma.match.findMany({
      where: { seasonId, organizationId: season.organizationId },
      select: {
        winnerTeamId: true,
        loserTeamId: true,
        winnerPointsBefore: true,
        winnerPointsAfter: true,
        loserPointsBefore: true,
        loserPointsAfter: true
      }
    })
  ]);

  return buildTeamStandings({
    teams,
    players: players.map((player) => ({ userId: player.userId, teamId: player.membership.teamId })),
    matches
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
