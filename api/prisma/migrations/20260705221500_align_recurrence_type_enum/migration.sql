DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE t.typname = 'RecurrenceType'
      AND n.nspname = 'public'
  ) THEN
    CREATE TYPE "RecurrenceType" AS ENUM ('NONE', 'WEEKLY', 'CUSTOM');
  END IF;
END $$;

ALTER TABLE "Class"
ALTER COLUMN "recurrenceType" DROP DEFAULT;

ALTER TABLE "Class"
ALTER COLUMN "recurrenceType" TYPE "RecurrenceType"
USING (
  CASE
    WHEN "recurrenceType" IN ('NONE', 'WEEKLY', 'CUSTOM') THEN "recurrenceType"
    ELSE 'NONE'
  END
)::"RecurrenceType";

ALTER TABLE "Class"
ALTER COLUMN "recurrenceType" SET DEFAULT 'NONE';
