DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'ClassType'
      AND e.enumlabel = 'EVENT'
  ) THEN
    ALTER TYPE "ClassType" ADD VALUE 'EVENT';
  END IF;
END $$;

ALTER TABLE "Class"
ADD COLUMN IF NOT EXISTS "weeklySchedules" JSONB;
