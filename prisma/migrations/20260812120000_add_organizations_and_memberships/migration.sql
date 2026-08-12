CREATE TYPE "OrganizationType" AS ENUM ('WORKPLACE', 'SPORTS_CLUB', 'SCHOOL', 'FRIENDS', 'OTHER');
CREATE TYPE "MembershipRole" AS ENUM ('OWNER', 'ADMIN', 'PLAYER');
CREATE TYPE "MembershipStatus" AS ENUM ('PENDING', 'ACTIVE', 'SUSPENDED', 'REJECTED');

CREATE TABLE "Organization" (
  "id" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "type" "OrganizationType" NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Organization_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Membership" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "role" "MembershipRole" NOT NULL DEFAULT 'PLAYER',
  "status" "MembershipStatus" NOT NULL DEFAULT 'PENDING',
  "displayName" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Membership_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Organization_slug_key" ON "Organization"("slug");
CREATE INDEX "Organization_name_idx" ON "Organization"("name");
CREATE UNIQUE INDEX "Membership_userId_organizationId_key" ON "Membership"("userId", "organizationId");
CREATE UNIQUE INDEX "Membership_id_userId_organizationId_key" ON "Membership"("id", "userId", "organizationId");
CREATE INDEX "Membership_organizationId_status_role_idx" ON "Membership"("organizationId", "status", "role");
CREATE INDEX "Membership_userId_status_idx" ON "Membership"("userId", "status");

ALTER TABLE "Membership" ADD CONSTRAINT "Membership_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Membership" ADD CONSTRAINT "Membership_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

INSERT INTO "Organization" ("id", "slug", "name", "type", "createdAt", "updatedAt")
VALUES ('org_polisen', 'polisen', 'Polisen', 'WORKPLACE', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- The oldest existing administrator becomes the initial owner. If an
-- environment has no administrator, the oldest user becomes owner instead.
-- Remaining administrators retain administrator privileges inside Polisen.
WITH ranked_users AS (
  SELECT
    "id",
    "isAdmin",
    ROW_NUMBER() OVER (ORDER BY "isAdmin" DESC, "createdAt" ASC, "id" ASC) AS owner_rank
  FROM "User"
)
INSERT INTO "Membership" (
  "id",
  "userId",
  "organizationId",
  "role",
  "status",
  "createdAt",
  "updatedAt"
)
SELECT
  'membership_polisen_' || "id",
  "id",
  'org_polisen',
  CASE
    WHEN owner_rank = 1 THEN 'OWNER'::"MembershipRole"
    WHEN "isAdmin" THEN 'ADMIN'::"MembershipRole"
    ELSE 'PLAYER'::"MembershipRole"
  END,
  'ACTIVE'::"MembershipStatus",
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM ranked_users;

ALTER TABLE "Team" ADD COLUMN "organizationId" TEXT;
ALTER TABLE "Season" ADD COLUMN "organizationId" TEXT;
ALTER TABLE "SeasonPlayer" ADD COLUMN "organizationId" TEXT;
ALTER TABLE "SeasonPlayer" ADD COLUMN "membershipId" TEXT;
ALTER TABLE "Match" ADD COLUMN "organizationId" TEXT;
ALTER TABLE "Challenge" ADD COLUMN "organizationId" TEXT;

UPDATE "Team" SET "organizationId" = 'org_polisen';
UPDATE "Season" SET "organizationId" = 'org_polisen';

UPDATE "SeasonPlayer" sp
SET
  "organizationId" = s."organizationId",
  "membershipId" = m."id"
FROM "Season" s
JOIN "Membership" m ON m."organizationId" = s."organizationId"
WHERE sp."seasonId" = s."id"
  AND m."userId" = sp."userId";

UPDATE "Match" m
SET "organizationId" = s."organizationId"
FROM "Season" s
WHERE m."seasonId" = s."id";

UPDATE "Challenge" c
SET "organizationId" = s."organizationId"
FROM "Season" s
WHERE c."seasonId" = s."id";

DO $$
DECLARE
  user_count BIGINT;
  membership_count BIGINT;
  owner_count BIGINT;
  orphaned_season_players BIGINT;
  orphaned_matches BIGINT;
  orphaned_challenges BIGINT;
BEGIN
  SELECT COUNT(*) INTO user_count FROM "User";
  SELECT COUNT(*) INTO membership_count
    FROM "Membership"
    WHERE "organizationId" = 'org_polisen' AND "status" = 'ACTIVE';
  SELECT COUNT(*) INTO owner_count
    FROM "Membership"
    WHERE "organizationId" = 'org_polisen' AND "role" = 'OWNER';
  SELECT COUNT(*) INTO orphaned_season_players
    FROM "SeasonPlayer"
    WHERE "organizationId" IS NULL OR "membershipId" IS NULL;
  SELECT COUNT(*) INTO orphaned_matches
    FROM "Match"
    WHERE "organizationId" IS NULL;
  SELECT COUNT(*) INTO orphaned_challenges
    FROM "Challenge"
    WHERE "organizationId" IS NULL;

  IF membership_count <> user_count THEN
    RAISE EXCEPTION 'Polisen migration expected % active memberships but created %', user_count, membership_count;
  END IF;

  IF user_count > 0 AND owner_count <> 1 THEN
    RAISE EXCEPTION 'Polisen migration expected exactly one owner but found %', owner_count;
  END IF;

  IF orphaned_season_players > 0 OR orphaned_matches > 0 OR orphaned_challenges > 0 THEN
    RAISE EXCEPTION 'Polisen migration found orphaned data: season players %, matches %, challenges %',
      orphaned_season_players, orphaned_matches, orphaned_challenges;
  END IF;
END $$;

ALTER TABLE "Team" ALTER COLUMN "organizationId" SET NOT NULL;
ALTER TABLE "Season" ALTER COLUMN "organizationId" SET NOT NULL;
ALTER TABLE "SeasonPlayer" ALTER COLUMN "organizationId" SET NOT NULL;
ALTER TABLE "SeasonPlayer" ALTER COLUMN "membershipId" SET NOT NULL;
ALTER TABLE "Match" ALTER COLUMN "organizationId" SET NOT NULL;
ALTER TABLE "Challenge" ALTER COLUMN "organizationId" SET NOT NULL;

DROP INDEX "Team_name_key";
DROP INDEX "Team_name_idx";
CREATE UNIQUE INDEX "Team_organizationId_name_key" ON "Team"("organizationId", "name");
CREATE INDEX "Team_organizationId_name_idx" ON "Team"("organizationId", "name");

DROP INDEX "Season_isActive_idx";
DROP INDEX "Season_year_idx";
DROP INDEX "Season_year_seasonNumber_idx";
CREATE UNIQUE INDEX "Season_id_organizationId_key" ON "Season"("id", "organizationId");
CREATE UNIQUE INDEX "Season_organizationId_year_seasonNumber_key" ON "Season"("organizationId", "year", "seasonNumber");
CREATE INDEX "Season_organizationId_isActive_idx" ON "Season"("organizationId", "isActive");
CREATE INDEX "Season_organizationId_year_idx" ON "Season"("organizationId", "year");

DROP INDEX "SeasonPlayer_seasonId_points_idx";
DROP INDEX "SeasonPlayer_userId_idx";
CREATE INDEX "SeasonPlayer_organizationId_seasonId_points_idx" ON "SeasonPlayer"("organizationId", "seasonId", "points");
CREATE INDEX "SeasonPlayer_organizationId_userId_idx" ON "SeasonPlayer"("organizationId", "userId");
CREATE INDEX "SeasonPlayer_membershipId_idx" ON "SeasonPlayer"("membershipId");

DROP INDEX "Match_seasonId_playedAt_idx";
CREATE INDEX "Match_organizationId_seasonId_playedAt_idx" ON "Match"("organizationId", "seasonId", "playedAt");

DROP INDEX "Challenge_seasonId_status_idx";
DROP INDEX "Challenge_seasonId_challengerId_challengedId_status_idx";
CREATE INDEX "Challenge_organizationId_seasonId_status_idx" ON "Challenge"("organizationId", "seasonId", "status");
CREATE INDEX "Challenge_organizationId_seasonId_challengerId_challengedId_status_idx"
  ON "Challenge"("organizationId", "seasonId", "challengerId", "challengedId", "status");

ALTER TABLE "Team" ADD CONSTRAINT "Team_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Season" ADD CONSTRAINT "Season_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "SeasonPlayer" DROP CONSTRAINT "SeasonPlayer_seasonId_fkey";
ALTER TABLE "SeasonPlayer" ADD CONSTRAINT "SeasonPlayer_seasonId_organizationId_fkey"
  FOREIGN KEY ("seasonId", "organizationId") REFERENCES "Season"("id", "organizationId") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SeasonPlayer" ADD CONSTRAINT "SeasonPlayer_membershipId_userId_organizationId_fkey"
  FOREIGN KEY ("membershipId", "userId", "organizationId") REFERENCES "Membership"("id", "userId", "organizationId") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Match" DROP CONSTRAINT "Match_seasonId_fkey";
ALTER TABLE "Match" ADD CONSTRAINT "Match_seasonId_organizationId_fkey"
  FOREIGN KEY ("seasonId", "organizationId") REFERENCES "Season"("id", "organizationId") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Challenge" DROP CONSTRAINT "Challenge_seasonId_fkey";
ALTER TABLE "Challenge" ADD CONSTRAINT "Challenge_seasonId_organizationId_fkey"
  FOREIGN KEY ("seasonId", "organizationId") REFERENCES "Season"("id", "organizationId") ON DELETE CASCADE ON UPDATE CASCADE;
