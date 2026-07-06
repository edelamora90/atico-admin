CREATE TABLE IF NOT EXISTS "ClassSession" (
  "id" TEXT NOT NULL,
  "classId" TEXT NOT NULL,
  "date" TIMESTAMP NOT NULL,
  "startTime" TEXT NOT NULL,
  "endTime" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'SCHEDULED',
  "roomId" TEXT,
  "teacherId" TEXT,
  "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "ClassSession_pkey" PRIMARY KEY ("id")
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'ClassSession_classId_fkey'
  ) THEN
    ALTER TABLE "ClassSession"
    ADD CONSTRAINT "ClassSession_classId_fkey"
    FOREIGN KEY ("classId") REFERENCES "Class"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "ClassSession_classId_idx" ON "ClassSession"("classId");
CREATE INDEX IF NOT EXISTS "ClassSession_date_idx" ON "ClassSession"("date");
CREATE INDEX IF NOT EXISTS "ClassSession_status_idx" ON "ClassSession"("status");

ALTER TABLE "Reservation"
ADD COLUMN IF NOT EXISTS "sessionId" TEXT;

ALTER TABLE "Attendance"
ADD COLUMN IF NOT EXISTS "sessionId" TEXT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'Reservation_sessionId_fkey'
  ) THEN
    ALTER TABLE "Reservation"
    ADD CONSTRAINT "Reservation_sessionId_fkey"
    FOREIGN KEY ("sessionId") REFERENCES "ClassSession"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'Attendance_sessionId_fkey'
  ) THEN
    ALTER TABLE "Attendance"
    ADD CONSTRAINT "Attendance_sessionId_fkey"
    FOREIGN KEY ("sessionId") REFERENCES "ClassSession"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "Reservation_sessionId_idx" ON "Reservation"("sessionId");
CREATE INDEX IF NOT EXISTS "Attendance_sessionId_idx" ON "Attendance"("sessionId");

INSERT INTO "ClassSession" (
  "id",
  "classId",
  "date",
  "startTime",
  "endTime",
  "status",
  "roomId",
  "teacherId",
  "createdAt",
  "updatedAt"
)
SELECT
  concat('legacy_', c."id"),
  c."id",
  c."startDate",
  to_char(c."startDate", 'HH24:MI'),
  to_char(
    COALESCE(
      c."endDate",
      c."startDate" + (c."durationMinutes" || ' minutes')::interval
    ),
    'HH24:MI'
  ),
  'SCHEDULED',
  c."roomId",
  c."teacherId",
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM "Class" c
WHERE NOT EXISTS (
  SELECT 1
  FROM "ClassSession" s
  WHERE s."id" = concat('legacy_', c."id")
);

UPDATE "Reservation" r
SET "sessionId" = concat('legacy_', r."classId")
WHERE r."sessionId" IS NULL
  AND EXISTS (
    SELECT 1 FROM "ClassSession" s WHERE s."id" = concat('legacy_', r."classId")
  );

UPDATE "Attendance" a
SET "sessionId" = concat('legacy_', a."classId")
WHERE a."sessionId" IS NULL
  AND EXISTS (
    SELECT 1 FROM "ClassSession" s WHERE s."id" = concat('legacy_', a."classId")
  );
