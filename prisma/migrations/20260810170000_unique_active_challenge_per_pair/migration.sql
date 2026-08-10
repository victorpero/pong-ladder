-- An active challenge is unique per season and player pair, in either direction.
-- Pending and Accepted are the states that represent an ongoing matchup.

-- Existing data can hold duplicates, because the previous guard only covered
-- Pending challenges in a single direction. Keep the oldest active challenge for
-- each season and pair and drop the newer ones, otherwise the unique index below
-- cannot be created and the migration would block application startup. Active
-- challenges never own a match, so no result history is affected.
DELETE FROM "Challenge" c
USING "Challenge" keep
WHERE c."status" IN ('Pending', 'Accepted')
  AND keep."status" IN ('Pending', 'Accepted')
  AND c."seasonId" = keep."seasonId"
  AND LEAST(c."challengerId", c."challengedId") = LEAST(keep."challengerId", keep."challengedId")
  AND GREATEST(c."challengerId", c."challengedId") = GREATEST(keep."challengerId", keep."challengedId")
  AND (keep."createdAt", keep."id") < (c."createdAt", c."id");

-- Superseded by the pair index below: two pending challenges in the same
-- direction are also two active challenges between the same pair.
DROP INDEX IF EXISTS "Challenge_pending_challenger_challenged_key";

CREATE UNIQUE INDEX "Challenge_active_pair_key"
  ON "Challenge"("seasonId", LEAST("challengerId", "challengedId"), GREATEST("challengerId", "challengedId"))
  WHERE "status" IN ('Pending', 'Accepted');
