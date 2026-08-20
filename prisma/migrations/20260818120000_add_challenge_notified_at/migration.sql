-- Records when the challenged player was emailed so the notification stays
-- idempotent per challenge even if the creation path runs more than once.
ALTER TABLE "Challenge"
  ADD COLUMN "notifiedAt" TIMESTAMP(3);
