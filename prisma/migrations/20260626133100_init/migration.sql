CREATE TYPE "ChallengeStatus" AS ENUM ('Pending', 'Accepted', 'Declined', 'Completed', 'Forfeit');

CREATE TABLE "User" (
  "id" TEXT NOT NULL,
  "username" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "passwordHash" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Season" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "year" INTEGER NOT NULL,
  "startsAt" TIMESTAMP(3) NOT NULL,
  "endsAt" TIMESTAMP(3),
  "isActive" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Season_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "SeasonPlayer" (
  "id" TEXT NOT NULL,
  "seasonId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "points" INTEGER NOT NULL DEFAULT 0,
  "currentRank" INTEGER NOT NULL,
  "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "SeasonPlayer_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Match" (
  "id" TEXT NOT NULL,
  "seasonId" TEXT NOT NULL,
  "winnerId" TEXT NOT NULL,
  "loserId" TEXT NOT NULL,
  "winnerSets" INTEGER NOT NULL,
  "loserSets" INTEGER NOT NULL,
  "winnerPointsBefore" INTEGER NOT NULL,
  "loserPointsBefore" INTEGER NOT NULL,
  "winnerPointsAfter" INTEGER NOT NULL,
  "loserPointsAfter" INTEGER NOT NULL,
  "playedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "challengeId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Match_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Challenge" (
  "id" TEXT NOT NULL,
  "seasonId" TEXT NOT NULL,
  "challengerId" TEXT NOT NULL,
  "challengedId" TEXT NOT NULL,
  "status" "ChallengeStatus" NOT NULL DEFAULT 'Pending',
  "declinedCount" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "completedAt" TIMESTAMP(3),
  CONSTRAINT "Challenge_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "User_username_key" ON "User"("username");
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE INDEX "User_username_idx" ON "User"("username");
CREATE INDEX "Season_isActive_idx" ON "Season"("isActive");
CREATE INDEX "Season_year_idx" ON "Season"("year");
CREATE UNIQUE INDEX "SeasonPlayer_seasonId_userId_key" ON "SeasonPlayer"("seasonId", "userId");
CREATE UNIQUE INDEX "SeasonPlayer_seasonId_currentRank_key" ON "SeasonPlayer"("seasonId", "currentRank");
CREATE INDEX "SeasonPlayer_seasonId_points_idx" ON "SeasonPlayer"("seasonId", "points");
CREATE INDEX "SeasonPlayer_userId_idx" ON "SeasonPlayer"("userId");
CREATE UNIQUE INDEX "Match_challengeId_key" ON "Match"("challengeId");
CREATE INDEX "Match_seasonId_playedAt_idx" ON "Match"("seasonId", "playedAt");
CREATE INDEX "Match_winnerId_idx" ON "Match"("winnerId");
CREATE INDEX "Match_loserId_idx" ON "Match"("loserId");
CREATE INDEX "Challenge_seasonId_status_idx" ON "Challenge"("seasonId", "status");
CREATE INDEX "Challenge_challengerId_idx" ON "Challenge"("challengerId");
CREATE INDEX "Challenge_challengedId_idx" ON "Challenge"("challengedId");

ALTER TABLE "SeasonPlayer" ADD CONSTRAINT "SeasonPlayer_seasonId_fkey" FOREIGN KEY ("seasonId") REFERENCES "Season"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SeasonPlayer" ADD CONSTRAINT "SeasonPlayer_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Match" ADD CONSTRAINT "Match_seasonId_fkey" FOREIGN KEY ("seasonId") REFERENCES "Season"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Match" ADD CONSTRAINT "Match_winnerId_fkey" FOREIGN KEY ("winnerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Match" ADD CONSTRAINT "Match_loserId_fkey" FOREIGN KEY ("loserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Match" ADD CONSTRAINT "Match_challengeId_fkey" FOREIGN KEY ("challengeId") REFERENCES "Challenge"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Challenge" ADD CONSTRAINT "Challenge_seasonId_fkey" FOREIGN KEY ("seasonId") REFERENCES "Season"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Challenge" ADD CONSTRAINT "Challenge_challengerId_fkey" FOREIGN KEY ("challengerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Challenge" ADD CONSTRAINT "Challenge_challengedId_fkey" FOREIGN KEY ("challengedId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

