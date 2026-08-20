import { prisma } from "@/lib/prisma";
import { activeChallengesForPlayerWhere } from "@/lib/challenge-rules";
import { ensureCurrentSeason } from "@/lib/fixed-seasons";
import { withEffectivePositions } from "@/lib/ladder-positions";
import { matchFeedOrderBy } from "@/lib/match-feed";
import { buildTeamStandings, recordedTeamResultWhere } from "@/lib/team-standings";

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
 * Every challenge that still ties the viewer to someone this season, pending and
 * accepted alike.
 *
 * One query serves both ladder features: the reportable cards filter it down to
 * accepted challenges, and the row controls need the pending ones as well.
 */
export async function getActiveChallengesForPlayer(organizationId: string, seasonId: string, userId: string) {
  return prisma.challenge.findMany({
    where: { organizationId, ...activeChallengesForPlayerWhere(seasonId, userId) },
    include: { challenger: true, challenged: true },
    // Oldest acceptance first: the match that has been waiting longest is reported first.
    orderBy: { updatedAt: "asc" }
  });
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

  return withEffectivePositions(
    buildTeamStandings({
      teams,
      players: players.map((player) => ({ userId: player.userId, teamId: player.membership.teamId })),
      matches
    })
  );
}

/**
 * Teams that already appear on a recorded result. They carry season history even
 * with an empty roster, so the teams page keeps them out of reach of deletion.
 */
export async function getTeamIdsWithRecordedResults(organizationId: string) {
  const matches = await prisma.match.findMany({
    where: { organizationId },
    select: { winnerTeamId: true, loserTeamId: true },
    distinct: ["winnerTeamId", "loserTeamId"]
  });

  const teamIds = new Set<string>();

  for (const match of matches) {
    if (match.winnerTeamId) {
      teamIds.add(match.winnerTeamId);
    }

    if (match.loserTeamId) {
      teamIds.add(match.loserTeamId);
    }
  }

  return teamIds;
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
