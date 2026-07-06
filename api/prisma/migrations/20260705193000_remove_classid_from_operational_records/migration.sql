DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM "Reservation" WHERE "sessionId" IS NULL) THEN
    RAISE EXCEPTION 'Cannot remove Reservation.classId: reservations without sessionId still exist.';
  END IF;

  IF EXISTS (SELECT 1 FROM "Attendance" WHERE "sessionId" IS NULL) THEN
    RAISE EXCEPTION 'Cannot remove Attendance.classId: attendances without sessionId still exist.';
  END IF;
END $$;

ALTER TABLE "ClassSession" DROP CONSTRAINT IF EXISTS "ClassSession_classId_fkey";
DROP INDEX IF EXISTS "ClassSession_classId_idx";

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'ClassSession'
      AND column_name = 'classId'
  ) AND NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'ClassSession'
      AND column_name = 'classTemplateId'
  ) THEN
    ALTER TABLE "ClassSession" RENAME COLUMN "classId" TO "classTemplateId";
  END IF;
END $$;

ALTER TABLE "ClassSession"
ADD CONSTRAINT "ClassSession_classTemplateId_fkey"
FOREIGN KEY ("classTemplateId") REFERENCES "Class"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE INDEX IF NOT EXISTS "ClassSession_classTemplateId_idx" ON "ClassSession"("classTemplateId");

ALTER TABLE "Reservation" DROP CONSTRAINT IF EXISTS "Reservation_classId_fkey";
ALTER TABLE "Attendance" DROP CONSTRAINT IF EXISTS "Attendance_classId_fkey";

ALTER TABLE "Reservation" DROP CONSTRAINT IF EXISTS "Reservation_sessionId_fkey";
ALTER TABLE "Attendance" DROP CONSTRAINT IF EXISTS "Attendance_sessionId_fkey";

ALTER TABLE "Reservation"
ALTER COLUMN "sessionId" SET NOT NULL;

ALTER TABLE "Attendance"
ALTER COLUMN "sessionId" SET NOT NULL;

ALTER TABLE "Reservation"
ADD CONSTRAINT "Reservation_sessionId_fkey"
FOREIGN KEY ("sessionId") REFERENCES "ClassSession"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Attendance"
ADD CONSTRAINT "Attendance_sessionId_fkey"
FOREIGN KEY ("sessionId") REFERENCES "ClassSession"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Reservation" DROP COLUMN IF EXISTS "classId";
ALTER TABLE "Attendance" DROP COLUMN IF EXISTS "classId";
