ALTER TABLE "Season" ADD COLUMN "seasonNumber" INTEGER;

UPDATE "Season"
SET "seasonNumber" = FLOOR((EXTRACT(MONTH FROM "startsAt")::INTEGER - 1) / 3) + 1;

UPDATE "Season"
SET
  "name" = CONCAT("year", ' Season ', "seasonNumber"),
  "startsAt" = MAKE_DATE("year", (("seasonNumber" - 1) * 3) + 1, 1)::TIMESTAMP,
  "endsAt" = (MAKE_DATE("year", (("seasonNumber" - 1) * 3) + 1, 1) + INTERVAL '3 months')::TIMESTAMP;

ALTER TABLE "Season" ALTER COLUMN "seasonNumber" SET NOT NULL;

CREATE INDEX "Season_year_seasonNumber_idx" ON "Season"("year", "seasonNumber");
