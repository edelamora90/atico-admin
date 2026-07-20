DO $$
BEGIN
  CREATE TYPE "ClassSessionCancellationType" AS ENUM (
    'WITH_TEACHER_PAYMENT',
    'WITHOUT_TEACHER_PAYMENT'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE "ClassSession"
ADD COLUMN IF NOT EXISTS "cancellationType" "ClassSessionCancellationType";

ALTER TABLE "ClassSession"
ADD COLUMN IF NOT EXISTS "cancellationReason" TEXT;

ALTER TABLE "ClassSession"
ADD COLUMN IF NOT EXISTS "cancelledAt" TIMESTAMP(3);

ALTER TABLE "ClassSession"
ADD COLUMN IF NOT EXISTS "cancelledById" TEXT;

CREATE INDEX IF NOT EXISTS "ClassSession_cancellationType_idx"
ON "ClassSession"("cancellationType");
