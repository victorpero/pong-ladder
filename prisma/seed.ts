import { ChallengeStatus, PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { getSeasonName } from "../lib/fixed-seasons";
import { calculateMatchScore } from "../lib/scoring";

const prisma = new PrismaClient();

async function main() {
  await prisma.match.deleteMany();
  await prisma.challenge.deleteMany();
  await prisma.seasonPlayer.deleteMany();
  await prisma.season.deleteMany();
  await prisma.user.deleteMany();
  await prisma.team.deleteMany();

  const year = new Date().getFullYear();
  const passwordHash = await bcrypt.hash("password123", 12);
  const seededTeams = await Promise.all(
    ["Spin Doctors", "Net Gains", "Paddle Force"].map((name) =>
      prisma.team.create({
        data: { name }
      })
    )
  );
  const players = [
    { username: "Anders", fullName: "Anders Persson", teamId: seededTeams[0].id },
    { username: "AndersPalm", fullName: "Anders Palm", teamId: seededTeams[0].id },
    { username: "Kalle", fullName: "Kalle Karlsson", teamId: seededTeams[1].id },
    { username: "Pelle", fullName: "Pelle Pettersson", teamId: seededTeams[1].id },
    { username: "Maja", fullName: "Maja Lind", teamId: seededTeams[2].id },
    { username: "Sara", fullName: "Sara Lund", teamId: seededTeams[2].id },
    { username: "Jonas", fullName: "Jonas Berg", teamId: null },
    { username: "Linnea", fullName: "Linnea Berg Andersson", teamId: null }
  ];

  const users = await Promise.all(
    [
      prisma.user.create({
        data: {
          username: "admin",
          fullName: "Pong Ladder Admin",
          email: "admin@pong.local",
          passwordHash,
          isAdmin: true
        }
      }),
      ...players.map((player) =>
        prisma.user.create({
          data: {
            username: player.username,
            fullName: player.fullName,
            email: `${player.username.toLowerCase()}@pong.local`,
            passwordHash,
            teamId: player.teamId
          }
        })
      )
    ]
  );

  const ladderUsers = users.slice(1);

  const currentSeasonNumber = Math.floor(new Date().getMonth() / 3) + 1;
  const seasons = await Promise.all(
    [1, 2, 3, 4].map((seasonNumber) =>
      prisma.season.create({
        data: {
          name: getSeasonName(year, seasonNumber),
          year,
          seasonNumber,
          startsAt: new Date(Date.UTC(year, (seasonNumber - 1) * 3, 1)),
          endsAt: new Date(Date.UTC(year, seasonNumber * 3, 1)),
          isActive: seasonNumber === currentSeasonNumber
        }
      })
    )
  );
  const season = seasons[currentSeasonNumber - 1];

  const startingPoints = [41, 32, 28, 22, 19, 16, 14, 11];

  await Promise.all(
    ladderUsers.map((user, index) =>
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
      challengerId: ladderUsers[3].id,
      challengedId: ladderUsers[1].id,
      status: ChallengeStatus.Completed,
      declinedCount: 0,
      completedAt: new Date(`${year}-03-14T18:00:00.000Z`)
    }
  });

  await registerSeedMatch({
    seasonId: season.id,
    winnerId: ladderUsers[0].id,
    loserId: ladderUsers[2].id,
    loserSets: 2,
    playedAt: new Date(`${year}-02-10T18:00:00.000Z`)
  });

  await registerSeedMatch({
    seasonId: season.id,
    winnerId: ladderUsers[3].id,
    loserId: ladderUsers[1].id,
    loserSets: 1,
    playedAt: new Date(`${year}-03-14T18:00:00.000Z`),
    challengeId: completedChallenge.id
  });

  await registerSeedMatch({
    seasonId: season.id,
    winnerId: ladderUsers[4].id,
    loserId: ladderUsers[5].id,
    loserSets: 0,
    playedAt: new Date(`${year}-04-02T17:30:00.000Z`)
  });

  await prisma.challenge.createMany({
    data: [
      {
        seasonId: season.id,
        challengerId: ladderUsers[5].id,
        challengedId: ladderUsers[4].id,
        status: ChallengeStatus.Pending,
        declinedCount: 0
      },
      {
        seasonId: season.id,
        challengerId: ladderUsers[7].id,
        challengedId: ladderUsers[6].id,
        status: ChallengeStatus.Accepted,
        declinedCount: 0
      },
      {
        seasonId: season.id,
        challengerId: ladderUsers[2].id,
        challengedId: ladderUsers[0].id,
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
