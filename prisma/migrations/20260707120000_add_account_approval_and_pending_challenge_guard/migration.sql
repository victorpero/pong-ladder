ALTER TABLE "User" ADD COLUMN "isApproved" BOOLEAN NOT NULL DEFAULT false;

UPDATE "User" SET "isApproved" = true;

CREATE INDEX "User_isApproved_idx" ON "User"("isApproved");
CREATE INDEX "Challenge_seasonId_challengerId_challengedId_status_idx" ON "Challenge"("seasonId", "challengerId", "challengedId", "status");
CREATE UNIQUE INDEX "Challenge_pending_challenger_challenged_key" ON "Challenge"("seasonId", "challengerId", "challengedId") WHERE "status" = 'Pending';
