ALTER TABLE "User" ADD COLUMN "fullName" TEXT;
UPDATE "User" SET "fullName" = "username";
ALTER TABLE "User" ALTER COLUMN "fullName" SET NOT NULL;
CREATE INDEX "User_fullName_idx" ON "User"("fullName");

