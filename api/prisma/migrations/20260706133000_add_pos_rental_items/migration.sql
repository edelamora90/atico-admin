DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'PosSaleItemType'
      AND e.enumlabel = 'RENTAL'
  ) THEN
    ALTER TYPE "PosSaleItemType" ADD VALUE 'RENTAL';
  END IF;
END $$;

ALTER TABLE "PosSaleItem"
ADD COLUMN IF NOT EXISTS "rentalId" TEXT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'PosSaleItemType'
      AND e.enumlabel = 'COURSE_EVENT'
  ) THEN
    ALTER TYPE "PosSaleItemType" ADD VALUE 'COURSE_EVENT';
  END IF;
END $$;

ALTER TABLE "PosSaleItem"
ADD COLUMN IF NOT EXISTS "courseEventId" TEXT;

CREATE INDEX IF NOT EXISTS "PosSaleItem_rentalId_idx"
ON "PosSaleItem"("rentalId");

CREATE INDEX IF NOT EXISTS "PosSaleItem_courseEventId_idx"
ON "PosSaleItem"("courseEventId");
