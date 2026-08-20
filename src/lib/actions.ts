"use server";

import { ChallengeStatus, MembershipJoinMethod, MembershipRole, MembershipStatus, Prisma } from "@prisma/client";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { requireOrganizationAdmin, requireOrganizationUser } from "@/lib/authz";
import { notifyChallengedPlayer } from "@/lib/challenge-notifications";
import { getRequestLocale } from "@/lib/i18n/server";
import { organizationPath } from "@/lib/organization-paths";
import { issueEmailVerification } from "@/lib/email-verification";
import {
  activeChallengeBetweenWhere,
  canChallengePlayer,
  challengeWindowMessage,
  duplicateActiveChallengeMessage,
  isStaleChallengeResultMessage,
  staleChallengeResultMessage,
  unreportableChallengeMessage
} from "@/lib/challenge-rules";
import { prisma } from "@/lib/prisma";
import { recalculateRanks } from "@/lib/rankings";
import { consumeRateLimit, getClientRateLimitKey } from "@/lib/rate-limit";
import { calculateMatchScore, validateBestOfFiveResult } from "@/lib/scoring";
import { joinActiveSeasonForUser } from "@/lib/season-membership";
import type { SessionPayload } from "@/lib/session";
import { revalidateOrganizationSections } from "@/lib/revalidation";

const playerSchema = z.object({
  username: z.string().trim().min(2).max(30),
  fullName: z.string().trim().min(2).max(120),
  email: z.string().trim().email(),
  password: z.string().min(8)
});

const teamSchema = z.object({
  name: z.string().trim().min(2).max(50)
});

const idSchema = z.string().min(1);
const organizationSlugSchema = z.string().trim().min(1).max(100).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);

const matchSchema = z.object({
  seasonId: idSchema,
  winnerId: idSchema,
  loserId: idSchema,
  loserSets: z.coerce.number().int().min(0).max(2),
  playedAt: z
    .string()
    .trim()
    .optional()
    .transform((value) => (value ? new Date(value) : new Date())),
  challengeId: idSchema
});

function value(formData: FormData, key: string) {
  return formData.get(key)?.toString() ?? "";
}

function maybeValue(formData: FormData, key: string) {
  const raw = formData.get(key)?.toString();
  return raw && raw.length > 0 ? raw : undefined;
}

function refreshApp(organizationSlug: string) {
  revalidateOrganizationSections(organizationSlug, ["ladder", "players", "teams", "matches", "challenges", "account"]);
}

async function getIsAdmin(userId: string, organizationId: string) {
  const membership = await prisma.membership.findUnique({
    where: { userId_organizationId: { userId, organizationId } },
    select: { role: true, status: true }
  });

  return Boolean(
    membership?.status === MembershipStatus.ACTIVE &&
      (membership.role === MembershipRole.ADMIN || membership.role === MembershipRole.OWNER)
  );
}

function organizationSlug(formData: FormData) {
  return organizationSlugSchema.parse(value(formData, "organizationSlug"));
}

async function requireActionUser(formData: FormData, section: string) {
  const slug = organizationSlug(formData);
  return requireOrganizationUser(slug, organizationPath(getRequestLocale(), slug, section));
}

async function requireAdmin(formData: FormData) {
  const slug = organizationSlug(formData);
  return requireOrganizationAdmin(slug, organizationPath(getRequestLocale(), slug, "admin"));
}

export async function createPlayer(formData: FormData) {
  const { organization, session } = await requireAdmin(formData);

  const parsed = playerSchema.parse({
    username: value(formData, "username"),
    fullName: value(formData, "fullName"),
    email: value(formData, "email"),
    password: value(formData, "password")
  });

  const passwordHash = await bcrypt.hash(parsed.password, 12);

  const user = await prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        username: parsed.username,
        fullName: parsed.fullName,
        email: parsed.email.toLowerCase(),
        isApproved: true
      }
    });

    await tx.account.create({
      data: {
        id: `credential_${user.id}`,
        userId: user.id,
        accountId: user.id,
        providerId: "credential",
        password: passwordHash
      }
    });

    await tx.membership.create({
      data: {
        userId: user.id,
        organizationId: organization.id,
        role: MembershipRole.PLAYER,
        status: MembershipStatus.ACTIVE,
        joinMethod: MembershipJoinMethod.ADMIN_CREATED,
        activatedAt: new Date(),
        reviewedAt: new Date(),
        reviewedById: session.sub
      }
    });

    return user;
  });

  await issueEmailVerification(user.id, user.email);

  refreshApp(organization.slug);
}

export async function joinSeason(formData: FormData) {
  const { organization } = await requireAdmin(formData);

  const userId = idSchema.parse(value(formData, "userId"));

  await prisma.$transaction(async (tx) => {
    const membership = await tx.membership.findUnique({
      where: { userId_organizationId: { userId, organizationId: organization.id } },
      select: { status: true }
    });

    if (membership?.status !== MembershipStatus.ACTIVE) {
      throw new Error("Approve the account before joining it to a season.");
    }

    await joinActiveSeasonForUser(tx, organization.id, userId);
  });

  refreshApp(organization.slug);
}

export async function joinCurrentSeason(formData: FormData) {
  const { session, organization } = await requireActionUser(formData, "ladder");

  await prisma.$transaction(async (tx) => {
    await joinActiveSeasonForUser(tx, organization.id, session.sub);
  });

  refreshApp(organization.slug);
}

export async function createTeam(formData: FormData) {
  const { session, organization } = await requireActionUser(formData, "teams");

  const parsed = teamSchema.parse({
    name: value(formData, "name")
  });

  try {
    await prisma.$transaction(async (tx) => {
      const team = await tx.team.create({
        data: { name: parsed.name, organizationId: organization.id }
      });

      await tx.membership.update({
        where: { userId_organizationId: { userId: session.sub, organizationId: organization.id } },
        data: { teamId: team.id }
      });
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      throw new Error("A team with that name already exists.");
    }

    throw error;
  }

  refreshApp(organization.slug);
}

export async function joinTeam(formData: FormData) {
  const { session, organization } = await requireActionUser(formData, "teams");

  const teamId = idSchema.parse(value(formData, "teamId"));

  const team = await prisma.team.findFirst({ where: { id: teamId, organizationId: organization.id }, select: { id: true } });
  if (!team) throw new Error("That team does not exist.");

  await prisma.membership.update({
    where: { userId_organizationId: { userId: session.sub, organizationId: organization.id } },
    data: { teamId: team.id }
  });

  refreshApp(organization.slug);
}

export async function leaveTeam(formData: FormData) {
  const { session, organization } = await requireActionUser(formData, "teams");

  await prisma.membership.update({
    where: { userId_organizationId: { userId: session.sub, organizationId: organization.id } },
    data: { teamId: null }
  });

  refreshApp(organization.slug);
}

export async function deleteTeam(formData: FormData) {
  const { organization } = await requireActionUser(formData, "teams");

  const teamId = idSchema.parse(value(formData, "teamId"));

  await prisma.$transaction(async (tx) => {
    const memberCount = await tx.membership.count({
      where: { teamId, organizationId: organization.id }
    });

    if (memberCount > 0) {
      throw new Error("Only teams without members can be deleted.");
    }

    const deleted = await tx.team.deleteMany({ where: { id: teamId, organizationId: organization.id } });
    if (deleted.count === 0) throw new Error("That team does not exist.");
  });

  refreshApp(organization.slug);
}

export async function createChallenge(formData: FormData) {
  const { session, organization } = await requireActionUser(formData, "challenges");
  consumeRateLimit(getClientRateLimitKey("challenge:create", session.sub), 20, 5 * 60 * 1000);

  const seasonId = idSchema.parse(value(formData, "seasonId"));
  const challengerId = session.sub;
  const challengedId = idSchema.parse(value(formData, "challengedId"));

  if (challengerId === challengedId) {
    throw new Error("Players cannot challenge themselves.");
  }

  let createdChallengeId: string;

  try {
    createdChallengeId = await prisma.$transaction(async (tx) => {
      const season = await tx.season.findUnique({
        where: { id: seasonId },
        select: { organizationId: true }
      });

      if (!season || season.organizationId !== organization.id) {
        throw new Error("That season does not exist.");
      }

      const ladder = await tx.seasonPlayer.findMany({
        where: {
          seasonId,
          organizationId: organization.id,
          membership: { status: MembershipStatus.ACTIVE }
        },
        orderBy: { currentRank: "asc" }
      });

      const challenger = ladder.find((player) => player.userId === challengerId);
      const challenged = ladder.find((player) => player.userId === challengedId);

      if (!challenger || !challenged) {
        throw new Error("Both players must be joined to the season.");
      }

      if (!canChallengePlayer(challenger, challenged)) {
        throw new Error(challengeWindowMessage);
      }

      const existingActiveChallenge = await tx.challenge.findFirst({
        where: activeChallengeBetweenWhere(seasonId, challengerId, challengedId),
        select: { id: true }
      });

      if (existingActiveChallenge) {
        throw new Error(duplicateActiveChallengeMessage);
      }

      const priorDeclines = await tx.challenge.count({
        where: {
          seasonId,
          challengerId,
          challengedId,
          status: { in: [ChallengeStatus.Declined, ChallengeStatus.Forfeit] }
        }
      });

      const challenge = await tx.challenge.create({
        data: {
          organizationId: season.organizationId,
          seasonId,
          challengerId,
          challengedId,
          declinedCount: priorDeclines,
          status: ChallengeStatus.Pending
        }
      });

      return challenge.id;
    });
  } catch (error) {
    // Two simultaneous requests both pass the lookup above; the unique index on
    // the active pair rejects whichever insert loses the race.
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      throw new Error(duplicateActiveChallengeMessage);
    }

    throw error;
  }

  // Only a committed challenge is announced, and a failed announcement leaves it in place.
  await notifyChallengedPlayer(createdChallengeId);

  refreshApp(organization.slug);
}

export async function acceptChallenge(formData: FormData) {
  const { session, organization } = await requireActionUser(formData, "challenges");

  const id = idSchema.parse(value(formData, "challengeId"));

  const result = await prisma.challenge.updateMany({
    where: {
      id,
      organizationId: organization.id,
      challengedId: session.sub,
      status: ChallengeStatus.Pending
    },
    data: { status: ChallengeStatus.Accepted }
  });

  if (result.count === 0) {
    throw new Error("Only the challenged player can accept a pending challenge.");
  }

  refreshApp(organization.slug);
}

export async function declineChallenge(formData: FormData) {
  const { session, organization } = await requireActionUser(formData, "challenges");

  const id = idSchema.parse(value(formData, "challengeId"));

  await prisma.$transaction(async (tx) => {
    const challenge = await tx.challenge.findUnique({
      where: { id },
      include: {
        challenger: true,
        challenged: true
      }
    });

    if (!challenge || challenge.organizationId !== organization.id || challenge.status !== ChallengeStatus.Pending) {
      throw new Error("Only pending challenges can be declined.");
    }

    if (challenge.challengedId !== session.sub) {
      throw new Error("Only the challenged player can decline a pending challenge.");
    }

    const priorDeclines = await tx.challenge.count({
      where: {
        seasonId: challenge.seasonId,
        challengerId: challenge.challengerId,
        challengedId: challenge.challengedId,
        status: { in: [ChallengeStatus.Declined, ChallengeStatus.Forfeit] },
        NOT: { id: challenge.id }
      }
    });

    if (priorDeclines >= 1 || challenge.declinedCount >= 1) {
      await registerMatchInTransaction(tx, {
        seasonId: challenge.seasonId,
        winnerId: challenge.challengerId,
        loserId: challenge.challengedId,
        loserSets: 0,
        playedAt: new Date(),
        challengeId: challenge.id
      });

      await tx.challenge.update({
        where: { id },
        data: {
          status: ChallengeStatus.Forfeit,
          declinedCount: priorDeclines + 1,
          completedAt: new Date()
        }
      });
    } else {
      await tx.challenge.update({
        where: { id },
        data: {
          status: ChallengeStatus.Declined,
          declinedCount: 1,
          completedAt: new Date()
        }
      });
    }
  });

  refreshApp(organization.slug);
}

export async function registerMatchResult(formData: FormData) {
  const { session, organization } = await requireActionUser(formData, "matches");
  consumeRateLimit(getClientRateLimitKey("match:register", session.sub), 20, 5 * 60 * 1000);

  const parsed = matchSchema.parse({
    seasonId: value(formData, "seasonId"),
    winnerId: value(formData, "winnerId"),
    loserId: value(formData, "loserId"),
    loserSets: value(formData, "loserSets"),
    playedAt: maybeValue(formData, "playedAt"),
    challengeId: value(formData, "challengeId")
  });

  if (parsed.winnerId === parsed.loserId) {
    throw new Error("Winner and loser must be different players.");
  }

  validateBestOfFiveResult(3, parsed.loserSets);

  const isAdmin = await getIsAdmin(session.sub, organization.id);
  assertCanRegisterMatch(session, isAdmin, parsed.winnerId, parsed.loserId);

  try {
    await prisma.$transaction(async (tx) => {
      await assertAcceptedChallengeForMatch(tx, {
        organizationId: organization.id,
        challengeId: parsed.challengeId,
        seasonId: parsed.seasonId,
        winnerId: parsed.winnerId,
        loserId: parsed.loserId
      });

      const season = await tx.season.findFirst({ where: { id: parsed.seasonId, organizationId: organization.id }, select: { id: true } });
      if (!season) throw new Error("That season does not exist.");
      await registerMatchInTransaction(tx, { ...parsed, requireChallengeStatus: ChallengeStatus.Accepted });
    });
  } catch (error) {
    // A second submission of the same challenge loses the race on the unique
    // match-per-challenge index rather than recording the result twice.
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      throw new Error(staleChallengeResultMessage);
    }

    throw error;
  }

  refreshApp(organization.slug);
}

export type MatchResultFormState = {
  error?: string;
  /** The challenge moved on while the page was open, so its result entry is dead. */
  stale?: boolean;
};

/**
 * Form-state wrapper around {@link registerMatchResult} for inline result entry.
 *
 * Result entry lives next to the ladder, where an unhandled throw would replace
 * the whole page with an error screen. Returning the failure instead lets the
 * card show what happened and stop offering a result that the server has
 * already rejected.
 */
export async function submitMatchResult(
  _state: MatchResultFormState,
  formData: FormData
): Promise<MatchResultFormState> {
  try {
    await registerMatchResult(formData);

    return {};
  } catch (error) {
    // redirect() and notFound() signal through thrown errors that Next must see.
    if (isFrameworkError(error)) {
      throw error;
    }

    const message = matchResultErrorMessage(error);

    return { error: message, stale: isStaleChallengeResultMessage(message) };
  }
}

function isFrameworkError(error: unknown) {
  const digest = (error as { digest?: unknown } | null)?.digest;

  return typeof digest === "string" && (digest.startsWith("NEXT_REDIRECT") || digest === "NEXT_NOT_FOUND");
}

function matchResultErrorMessage(error: unknown) {
  if (error instanceof z.ZodError) {
    return "Check the winner, loser and result before saving.";
  }

  // Rate-limit and rule violations already carry a message meant for the player.
  if (error instanceof Error) {
    return error.message;
  }

  return "The result could not be saved.";
}

function assertCanRegisterMatch(session: SessionPayload, isAdmin: boolean, winnerId: string, loserId: string) {
  if (isAdmin || session.sub === winnerId || session.sub === loserId) {
    return;
  }

  throw new Error("Only admins or match participants can register match results.");
}

async function assertAcceptedChallengeForMatch(
  tx: Prisma.TransactionClient,
  input: {
    organizationId: string;
    challengeId: string;
    seasonId: string;
    winnerId: string;
    loserId: string;
  }
) {
  const challenge = await tx.challenge.findUnique({
    where: { id: input.challengeId },
    select: {
      organizationId: true,
      seasonId: true,
      challengerId: true,
      challengedId: true,
      status: true
    }
  });

  if (!challenge || challenge.status !== ChallengeStatus.Accepted) {
    throw new Error(unreportableChallengeMessage);
  }

  const matchPlayerIds = new Set([input.winnerId, input.loserId]);
  const challengePlayerIds = new Set([challenge.challengerId, challenge.challengedId]);
  const matchesChallengePlayers =
    matchPlayerIds.size === challengePlayerIds.size && [...matchPlayerIds].every((playerId) => challengePlayerIds.has(playerId));

  if (challenge.organizationId !== input.organizationId || challenge.seasonId !== input.seasonId || !matchesChallengePlayers) {
    throw new Error("Match results must use the same season and players as the accepted challenge.");
  }
}

async function registerMatchInTransaction(
  tx: Prisma.TransactionClient,
  input: {
    seasonId: string;
    winnerId: string;
    loserId: string;
    loserSets: number;
    playedAt: Date;
    challengeId?: string;
    /** Set when the caller has already read the challenge and needs that read to still hold. */
    requireChallengeStatus?: ChallengeStatus;
  }
) {
  const [winner, loser] = await Promise.all([
    tx.seasonPlayer.findUnique({
      where: { seasonId_userId: { seasonId: input.seasonId, userId: input.winnerId } }
    }),
    tx.seasonPlayer.findUnique({
      where: { seasonId_userId: { seasonId: input.seasonId, userId: input.loserId } }
    })
  ]);

  if (!winner || !loser) {
    throw new Error("Both match players must be joined to the season.");
  }

  if (winner.organizationId !== loser.organizationId) {
    throw new Error("Match players must belong to the same organization.");
  }

  const score = calculateMatchScore({
    winnerPointsBefore: winner.points,
    loserPointsBefore: loser.points,
    winnerSets: 3,
    loserSets: input.loserSets as 0 | 1 | 2
  });

  await tx.match.create({
    data: {
      organizationId: winner.organizationId,
      seasonId: input.seasonId,
      winnerId: input.winnerId,
      loserId: input.loserId,
      winnerSets: 3,
      loserSets: input.loserSets,
      winnerPointsBefore: winner.points,
      loserPointsBefore: loser.points,
      winnerPointsAfter: score.winnerPointsAfter,
      loserPointsAfter: score.loserPointsAfter,
      playedAt: input.playedAt,
      challengeId: input.challengeId
    }
  });

  await tx.seasonPlayer.update({
    where: { id: winner.id },
    data: { points: score.winnerPointsAfter }
  });

  await tx.seasonPlayer.update({
    where: { id: loser.id },
    data: { points: score.loserPointsAfter }
  });

  if (input.challengeId) {
    // Conditional so a challenge another participant closed in the meantime
    // rolls the whole result back instead of overwriting the newer state.
    const completed = await tx.challenge.updateMany({
      where: {
        id: input.challengeId,
        ...(input.requireChallengeStatus ? { status: input.requireChallengeStatus } : {})
      },
      data: {
        status: ChallengeStatus.Completed,
        completedAt: input.playedAt
      }
    });

    if (completed.count === 0) {
      throw new Error(staleChallengeResultMessage);
    }
  }

  await recalculateRanks(tx, input.seasonId);
}
