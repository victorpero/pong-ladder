import { ChallengeStatus, PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { calculateMatchScore } from "../lib/scoring";

const prisma = new PrismaClient();

async function main() {
  await prisma.match.deleteMany();
  await prisma.challenge.deleteMany();
  await prisma.seasonPlayer.deleteMany();
  await prisma.season.deleteMany();
  await prisma.user.deleteMany();

  const year = new Date().getFullYear();
  const passwordHash = await bcrypt.hash("password123", 12);
  const players = [
    { username: "Anders", fullName: "Anders Persson" },
    { username: "AndersPalm", fullName: "Anders Palm" },
    { username: "Kalle", fullName: "Kalle Karlsson" },
    { username: "Pelle", fullName: "Pelle Pettersson" },
    { username: "Maja", fullName: "Maja Lind" },
    { username: "Sara", fullName: "Sara Lund" },
    { username: "Jonas", fullName: "Jonas Berg" },
    { username: "Linnea", fullName: "Linnea Berg Andersson" }
  ];

  const users = await Promise.all(
    players.map((player) =>
      prisma.user.create({
        data: {
          username: player.username,
          fullName: player.fullName,
          email: `${player.username.toLowerCase()}@pong.local`,
          passwordHash
        }
      })
    )
  );

  const season = await prisma.season.create({
    data: {
      name: `${year} Club Ladder`,
      year,
      startsAt: new Date(`${year}-01-01T00:00:00.000Z`),
      endsAt: new Date(`${year}-12-31T23:59:59.000Z`),
      isActive: true
    }
  });

  const startingPoints = [41, 32, 28, 22, 19, 16, 14, 11];

  await Promise.all(
    users.map((user, index) =>
      prisma.seasonPlayer.create({
        data: {
          seasonId: season.id,
          userId: user.id,
          points: startingPoints[index],
          currentRank: index + 1,
          joinedAt: new Date(`${year}-01-${String(index + 2).padStart(2, "0")}T10:00:00.000Z`)
        }
      })
    )
  );

  const completedChallenge = await prisma.challenge.create({
    data: {
      seasonId: season.id,
      challengerId: users[3].id,
      challengedId: users[1].id,
      status: ChallengeStatus.Completed,
      declinedCount: 0,
      completedAt: new Date(`${year}-03-14T18:00:00.000Z`)
    }
  });

  await registerSeedMatch({
    seasonId: season.id,
    winnerId: users[0].id,
    loserId: users[2].id,
    loserSets: 2,
    playedAt: new Date(`${year}-02-10T18:00:00.000Z`)
  });

  await registerSeedMatch({
    seasonId: season.id,
    winnerId: users[3].id,
    loserId: users[1].id,
    loserSets: 1,
    playedAt: new Date(`${year}-03-14T18:00:00.000Z`),
    challengeId: completedChallenge.id
  });

  await registerSeedMatch({
    seasonId: season.id,
    winnerId: users[4].id,
    loserId: users[5].id,
    loserSets: 0,
    playedAt: new Date(`${year}-04-02T17:30:00.000Z`)
  });

  await prisma.challenge.createMany({
    data: [
      {
        seasonId: season.id,
        challengerId: users[5].id,
        challengedId: users[4].id,
        status: ChallengeStatus.Pending,
        declinedCount: 0
      },
      {
        seasonId: season.id,
        challengerId: users[7].id,
        challengedId: users[6].id,
        status: ChallengeStatus.Accepted,
        declinedCount: 0
      },
      {
        seasonId: season.id,
        challengerId: users[2].id,
        challengedId: users[0].id,
        status: ChallengeStatus.Declined,
        declinedCount: 1,
        completedAt: new Date(`${year}-05-01T12:00:00.000Z`)
      }
    ]
  });

  await recalculateSeedRanks(season.id);
}

async function registerSeedMatch(input: {
  seasonId: string;
  winnerId: string;
  loserId: string;
  loserSets: 0 | 1 | 2;
  playedAt: Date;
  challengeId?: string;
}) {
  const [winner, loser] = await Promise.all([
    prisma.seasonPlayer.findUniqueOrThrow({
      where: { seasonId_userId: { seasonId: input.seasonId, userId: input.winnerId } }
    }),
    prisma.seasonPlayer.findUniqueOrThrow({
      where: { seasonId_userId: { seasonId: input.seasonId, userId: input.loserId } }
    })
  ]);

  const score = calculateMatchScore({
    winnerPointsBefore: winner.points,
    loserPointsBefore: loser.points,
    winnerSets: 3,
    loserSets: input.loserSets
  });

  await prisma.match.create({
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

  await prisma.seasonPlayer.update({
    where: { id: winner.id },
    data: { points: score.winnerPointsAfter }
  });

  await prisma.seasonPlayer.update({
    where: { id: loser.id },
    data: { points: score.loserPointsAfter }
  });
}

async function recalculateSeedRanks(seasonId: string) {
  const players = await prisma.seasonPlayer.findMany({
    where: { seasonId },
    orderBy: [{ points: "desc" }, { joinedAt: "asc" }]
  });

  for (const [index, player] of players.entries()) {
    await prisma.seasonPlayer.update({
      where: { id: player.id },
      data: { currentRank: -(index + 1) }
    });
  }

  for (const [index, player] of players.entries()) {
    await prisma.seasonPlayer.update({
      where: { id: player.id },
      data: { currentRank: index + 1 }
    });
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
