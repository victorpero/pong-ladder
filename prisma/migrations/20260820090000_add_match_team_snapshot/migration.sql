-- Rollout: this migration is not compatible with a rolling release.
-- The new code selects the snapshot columns, so it cannot start before the
-- migration runs; the old code does not know the columns, so any result it
-- registers after the migration is inserted with NULL snapshots that the
-- backfill below has already passed by, and a NULL then means both "unteamed"
-- and "never recorded". Stop the old version before applying this migration and
-- start only the new one afterwards.

ALTER TABLE "Match"
  ADD COLUMN "winnerTeamId" TEXT,
  ADD COLUMN "loserTeamId" TEXT;

-- Backfill existing results from the current team assignments. This is the best
-- available approximation of history: no earlier assignment was ever recorded.
UPDATE "Match"
SET "winnerTeamId" = "Membership"."teamId"
FROM "Membership"
WHERE "Membership"."userId" = "Match"."winnerId"
  AND "Membership"."organizationId" = "Match"."organizationId";

UPDATE "Match"
SET "loserTeamId" = "Membership"."teamId"
FROM "Membership"
WHERE "Membership"."userId" = "Match"."loserId"
  AND "Membership"."organizationId" = "Match"."organizationId";

CREATE INDEX "Match_seasonId_winnerTeamId_idx" ON "Match"("seasonId", "winnerTeamId");
CREATE INDEX "Match_seasonId_loserTeamId_idx" ON "Match"("seasonId", "loserTeamId");
