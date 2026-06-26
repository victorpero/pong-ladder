"use server";

import { ChallengeStatus, Prisma } from "@prisma/client";
import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { canChallengePlayer, challengeWindowMessage } from "@/lib/challenge-rules";
import { prisma } from "@/lib/prisma";
import { recalculateRanks } from "@/lib/rankings";
import { calculateMatchScore, validateBestOfFiveResult } from "@/lib/scoring";
import { joinActiveSeasonForUser } from "@/lib/season-membership";
import { SESSION_COOKIE_NAME, verifySessionToken } from "@/lib/session";

const playerSchema = z.object({
  username: z.string().trim().min(2).max(30),
  fullName: z.string().trim().min(2).max(120),
  email: z.string().trim().email(),
  password: z.string().min(8)
});

const seasonSchema = z.object({
  name: z.string().trim().min(3),
  year: z.coerce.number().int().min(2000).max(2100),
  startsAt: z.coerce.date(),
  endsAt: z
    .string()
    .trim()
    .optional()
    .transform((value) => (value ? new Date(value) : undefined)),
  isActive: z.coerce.boolean().default(false)
});

const idSchema = z.string().min(1);

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
  challengeId: z.string().optional()
});

function value(formData: FormData, key: string) {
  return formData.get(key)?.toString() ?? "";
}

function maybeValue(formData: FormData, key: string) {
  const raw = formData.get(key)?.toString();
  return raw && raw.length > 0 ? raw : undefined;
}

function refreshApp() {
  revalidatePath("/ladder");
  revalidatePath("/players");
  revalidatePath("/matches");
  revalidatePath("/challenges");
  revalidatePath("/account");
}

export async function createPlayer(formData: FormData) {
  const parsed = playerSchema.parse({
    username: value(formData, "username"),
    fullName: value(formData, "fullName"),
    email: value(formData, "email"),
    password: value(formData, "password")
  });

  const passwordHash = await bcrypt.hash(parsed.password, 12);

  await prisma.user.create({
    data: {
      username: parsed.username,
      fullName: parsed.fullName,
      email: parsed.email,
      passwordHash
    }
  });

  refreshApp();
}

export async function createSeason(formData: FormData) {
  const parsed = seasonSchema.parse({
    name: value(formData, "name"),
    year: value(formData, "year"),
    startsAt: value(formData, "startsAt"),
    endsAt: maybeValue(formData, "endsAt"),
    isActive: formData.get("isActive") === "on"
  });

  await prisma.$transaction(async (tx) => {
    if (parsed.isActive) {
      await tx.season.updateMany({ data: { isActive: false } });
    }

    await tx.season.create({
      data: parsed
    });
  });

  refreshApp();
}

export async function joinSeason(formData: FormData) {
  const seasonId = idSchema.parse(value(formData, "seasonId"));
  const userId = idSchema.parse(value(formData, "userId"));

  await prisma.$transaction(async (tx) => {
    const existing = await tx.seasonPlayer.findUnique({
      where: { seasonId_userId: { seasonId, userId } }
    });

    if (existing) {
      return;
    }

    const count = await tx.seasonPlayer.count({ where: { seasonId } });

    await tx.seasonPlayer.create({
      data: {
        seasonId,
        userId,
        points: 0,
        currentRank: count + 1
      }
    });
  });

  refreshApp();
}

export async function joinCurrentSeason() {
  const session = await verifySessionToken(cookies().get(SESSION_COOKIE_NAME)?.value);

  if (!session) {
    redirect("/login?next=/ladder");
  }

  await prisma.$transaction(async (tx) => {
    await joinActiveSeasonForUser(tx, session.sub);
  });

  refreshApp();
}

export async function createChallenge(formData: FormData) {
  const seasonId = idSchema.parse(value(formData, "seasonId"));
  const challengerId = idSchema.parse(value(formData, "challengerId"));
  const challengedId = idSchema.parse(value(formData, "challengedId"));

  if (challengerId === challengedId) {
    throw new Error("Players cannot challenge themselves.");
  }

  await prisma.$transaction(async (tx) => {
    const ladder = await tx.seasonPlayer.findMany({
      where: { seasonId },
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

    const priorDeclines = await tx.challenge.count({
      where: {
        seasonId,
        challengerId,
        challengedId,
        status: { in: [ChallengeStatus.Declined, ChallengeStatus.Forfeit] }
      }
    });

    await tx.challenge.create({
      data: {
        seasonId,
        challengerId,
        challengedId,
        declinedCount: priorDeclines,
        status: ChallengeStatus.Pending
      }
    });
  });

  refreshApp();
}

export async function acceptChallenge(formData: FormData) {
  const id = idSchema.parse(value(formData, "challengeId"));

  await prisma.challenge.update({
    where: { id },
    data: { status: ChallengeStatus.Accepted }
  });

  refreshApp();
}

export async function declineChallenge(formData: FormData) {
  const id = idSchema.parse(value(formData, "challengeId"));

  await prisma.$transaction(async (tx) => {
    const challenge = await tx.challenge.findUnique({
      where: { id },
      include: {
        challenger: true,
        challenged: true
      }
    });

    if (!challenge || challenge.status !== ChallengeStatus.Pending) {
      throw new Error("Only pending challenges can be declined.");
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

  refreshApp();
}

export async function registerMatchResult(formData: FormData) {
  const parsed = matchSchema.parse({
    seasonId: value(formData, "seasonId"),
    winnerId: value(formData, "winnerId"),
    loserId: value(formData, "loserId"),
    loserSets: value(formData, "loserSets"),
    playedAt: maybeValue(formData, "playedAt"),
    challengeId: maybeValue(formData, "challengeId")
  });

  if (parsed.winnerId === parsed.loserId) {
    throw new Error("Winner and loser must be different players.");
  }

  validateBestOfFiveResult(3, parsed.loserSets);

  await prisma.$transaction(async (tx) => {
    await registerMatchInTransaction(tx, parsed);
  });

  refreshApp();
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

  const score = calculateMatchScore({
    winnerPointsBefore: winner.points,
    loserPointsBefore: loser.points,
    winnerSets: 3,
    loserSets: input.loserSets as 0 | 1 | 2
  });

  await tx.match.create({
    data: {
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
    await tx.challenge.update({
      where: { id: input.challengeId },
      data: {
        status: ChallengeStatus.Completed,
        completedAt: input.playedAt
      }
    });
  }

  await recalculateRanks(tx, input.seasonId);
}
