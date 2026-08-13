"use server";

import { ChallengeStatus, MembershipStatus, Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { openPlayerChallengeWhere, playerChallengeWhere, playerMatchWhere } from "@/lib/admin-cleanup";
import { requireOrganizationAdmin } from "@/lib/authz";
import { organizationPath, organizationsPath } from "@/lib/organization-paths";
import { prisma } from "@/lib/prisma";
import { recalculateRanks } from "@/lib/rankings";
import { calculateMatchScore } from "@/lib/scoring";
import { addPlayerToSeason, alreadyInSeasonMessage } from "@/lib/season-membership";

const idSchema = z.string().min(1);
const organizationSlugSchema = z.string().trim().min(1).max(100).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);

const addSeasonPlayerSchema = z.object({
  seasonId: idSchema,
  userId: idSchema
});

export type AdminFormState = {
  error?: string;
  success?: string;
};

/** Rejections the admin can act on, surfaced as form feedback instead of an error page. */
class AdminActionError extends Error {}

function value(formData: FormData, key: string) {
  return formData.get(key)?.toString() ?? "";
}

function refreshAdmin(organizationSlug: string) {
  revalidatePath(organizationsPath);
  revalidatePath(organizationPath(organizationSlug, "admin"));
  revalidatePath(organizationPath(organizationSlug, "ladder"));
  revalidatePath(organizationPath(organizationSlug, "players"));
  revalidatePath(organizationPath(organizationSlug, "matches"));
  revalidatePath(organizationPath(organizationSlug, "challenges"));
  revalidatePath(organizationPath(organizationSlug, "teams"));
  revalidatePath(organizationPath(organizationSlug, "account"));
}

async function requireAdmin(formData: FormData) {
  const slug = organizationSlugSchema.parse(value(formData, "organizationSlug"));
  return requireOrganizationAdmin(slug, organizationPath(slug, "admin"));
}

async function rebuildSeasonStandings(tx: Prisma.TransactionClient, seasonId: string) {
  const season = await tx.season.findUniqueOrThrow({
    where: { id: seasonId },
    select: { organizationId: true }
  });
  const players = await tx.seasonPlayer.findMany({
    where: { seasonId, organizationId: season.organizationId },
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
    where: { seasonId, organizationId: season.organizationId },
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

export async function adminApproveUser(formData: FormData) {
  const { organization, session } = await requireAdmin(formData);
  const userId = idSchema.parse(value(formData, "userId"));

  await prisma.membership.updateMany({
    where: {
      userId,
      organizationId: organization.id,
      status: MembershipStatus.PENDING
    },
    data: {
      status: MembershipStatus.ACTIVE,
      activatedAt: new Date(),
      reviewedAt: new Date(),
      reviewedById: session.sub
    }
  });

  refreshAdmin(organization.slug);
}

export async function adminDeclinePendingUser(formData: FormData) {
  const { organization, session } = await requireAdmin(formData);
  const userId = idSchema.parse(value(formData, "userId"));

  await prisma.membership.updateMany({
    where: { userId, organizationId: organization.id, status: MembershipStatus.PENDING },
    data: { status: MembershipStatus.REJECTED, reviewedAt: new Date(), reviewedById: session.sub }
  });

  refreshAdmin(organization.slug);
}

export async function adminAddSeasonPlayer(_state: AdminFormState, formData: FormData): Promise<AdminFormState> {
  const { organization } = await requireAdmin(formData);

  const parsed = addSeasonPlayerSchema.safeParse({
    seasonId: value(formData, "seasonId"),
    userId: value(formData, "userId")
  });

  if (!parsed.success) {
    return { error: "Select a player to add to the season." };
  }

  const { seasonId, userId } = parsed.data;

  try {
    const { created, user } = await prisma.$transaction(async (tx) => {
      const season = await tx.season.findUnique({
        where: { id: seasonId },
        select: { id: true, organizationId: true, isActive: true }
      });

      if (!season || season.organizationId !== organization.id) {
        throw new AdminActionError("That season no longer exists.");
      }

      // Past seasons stay untouched so historical standings and match history keep their meaning.
      if (!season.isActive) {
        throw new AdminActionError("Players can only be added to the active season.");
      }

      const user = await tx.user.findFirst({
        where: {
          id: userId,
          memberships: {
            some: { organizationId: organization.id, status: MembershipStatus.ACTIVE }
          }
        },
        select: { id: true, username: true }
      });

      if (!user) {
        throw new AdminActionError("Select an approved player.");
      }

      const { created } = await addPlayerToSeason(tx, season.id, user.id);

      return { created, user };
    });

    if (!created) {
      return { error: alreadyInSeasonMessage };
    }

    refreshAdmin(organization.slug);

    return { success: `${user.username} was added to the season.` };
  } catch (error) {
    if (error instanceof AdminActionError) {
      return { error: error.message };
    }

    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return { error: alreadyInSeasonMessage };
    }

    throw error;
  }
}

export async function adminRemoveSeasonPlayer(formData: FormData) {
  const { organization } = await requireAdmin(formData);
  const seasonPlayerId = idSchema.parse(value(formData, "seasonPlayerId"));

  await prisma.$transaction(async (tx) => {
    const seasonPlayer = await tx.seasonPlayer.findUnique({
      where: { id: seasonPlayerId },
      select: { id: true, organizationId: true, seasonId: true, userId: true }
    });

    if (!seasonPlayer || seasonPlayer.organizationId !== organization.id) {
      return;
    }

    await tx.match.deleteMany({
      where: {
        organizationId: organization.id,
        seasonId: seasonPlayer.seasonId,
        ...playerMatchWhere(seasonPlayer.userId)
      }
    });

    await tx.challenge.deleteMany({
      where: {
        organizationId: organization.id,
        seasonId: seasonPlayer.seasonId,
        ...playerChallengeWhere(seasonPlayer.userId)
      }
    });

    await tx.seasonPlayer.delete({
      where: { id: seasonPlayer.id }
    });

    await rebuildSeasonStandings(tx, seasonPlayer.seasonId);
  });

  refreshAdmin(organization.slug);
}

export async function adminCancelOpenChallengesForPlayer(formData: FormData) {
  const { organization } = await requireAdmin(formData);
  const userId = idSchema.parse(value(formData, "userId"));

  await prisma.$transaction(async (tx) => {
    const user = await tx.user.findUnique({
      where: { id: userId },
      select: { id: true }
    });

    if (!user) {
      return;
    }

    await tx.challenge.deleteMany({
      where: { organizationId: organization.id, ...openPlayerChallengeWhere(user.id) }
    });
  });

  refreshAdmin(organization.slug);
}

export async function adminDeletePlayer(formData: FormData) {
  const { organization } = await requireAdmin(formData);
  const userId = idSchema.parse(value(formData, "userId"));

  await prisma.$transaction(async (tx) => {
    await tx.challenge.deleteMany({
      where: { organizationId: organization.id, ...openPlayerChallengeWhere(userId) }
    });

    await tx.membership.updateMany({
      where: { userId, organizationId: organization.id, status: MembershipStatus.ACTIVE },
      data: { status: MembershipStatus.SUSPENDED }
    });
  });

  refreshAdmin(organization.slug);
}

export async function adminDeleteMatch(formData: FormData) {
  const { organization } = await requireAdmin(formData);
  const matchId = idSchema.parse(value(formData, "matchId"));

  await prisma.$transaction(async (tx) => {
    const match = await tx.match.findUnique({
      where: { id: matchId },
      select: { id: true, organizationId: true, seasonId: true, challengeId: true }
    });

    if (!match || match.organizationId !== organization.id) {
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

  refreshAdmin(organization.slug);
}

export async function adminDeleteChallenge(formData: FormData) {
  const { organization } = await requireAdmin(formData);
  const challengeId = idSchema.parse(value(formData, "challengeId"));

  await prisma.$transaction(async (tx) => {
    const challenge = await tx.challenge.findUnique({
      where: { id: challengeId },
      select: {
        id: true,
        organizationId: true,
        seasonId: true,
        match: {
          select: { id: true }
        }
      }
    });

    if (!challenge || challenge.organizationId !== organization.id) {
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

  refreshAdmin(organization.slug);
}
