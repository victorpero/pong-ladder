ALTER TABLE "Membership" ADD COLUMN "teamId" TEXT;

UPDATE "Membership" m
SET "teamId" = u."teamId"
FROM "User" u
JOIN "Team" t ON t."id" = u."teamId"
WHERE m."userId" = u."id"
  AND m."organizationId" = t."organizationId";

ALTER TABLE "User" DROP CONSTRAINT "User_teamId_fkey";
DROP INDEX "User_teamId_idx";
ALTER TABLE "User" DROP COLUMN "teamId";

CREATE INDEX "Membership_teamId_idx" ON "Membership"("teamId");
ALTER TABLE "Membership" ADD CONSTRAINT "Membership_teamId_fkey"
  FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE SET NULL ON UPDATE CASCADE;
