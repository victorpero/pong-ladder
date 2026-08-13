DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = current_schema()
      AND table_name = 'Membership'
      AND column_name = 'approvedById'
  ) AND NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = current_schema()
      AND table_name = 'Membership'
      AND column_name = 'reviewedById'
  ) THEN
    ALTER TABLE "Membership" RENAME COLUMN "approvedById" TO "reviewedById";
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = current_schema()
      AND table_name = 'Membership'
      AND column_name = 'reviewedAt'
  ) THEN
    ALTER TABLE "Membership" ADD COLUMN "reviewedAt" TIMESTAMP(3);
  END IF;
END $$;
