CREATE TABLE IF NOT EXISTS "TeacherPaymentSetting" (
  "id" TEXT NOT NULL,
  "minimumClassAmount" DECIMAL(65,30) NOT NULL DEFAULT 50,
  "cancellationWithPaymentAmount" DECIMAL(65,30),
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "TeacherPaymentSetting_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "TeacherPaymentRange" (
  "id" TEXT NOT NULL,
  "settingId" TEXT NOT NULL,
  "minStudents" INTEGER NOT NULL,
  "maxStudents" INTEGER,
  "amount" DECIMAL(65,30) NOT NULL,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,

  CONSTRAINT "TeacherPaymentRange_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "TeacherPaymentSetting_isActive_idx" ON "TeacherPaymentSetting"("isActive");
CREATE INDEX IF NOT EXISTS "TeacherPaymentRange_settingId_idx" ON "TeacherPaymentRange"("settingId");
CREATE INDEX IF NOT EXISTS "TeacherPaymentRange_minStudents_idx" ON "TeacherPaymentRange"("minStudents");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'TeacherPaymentRange_settingId_fkey'
  ) THEN
    ALTER TABLE "TeacherPaymentRange"
    ADD CONSTRAINT "TeacherPaymentRange_settingId_fkey"
    FOREIGN KEY ("settingId") REFERENCES "TeacherPaymentSetting"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
