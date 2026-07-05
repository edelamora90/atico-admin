-- Add nullable columns first so existing administrators can be backfilled safely.
ALTER TABLE "Administrator" ADD COLUMN "username" TEXT;
ALTER TABLE "Administrator" ADD COLUMN "passwordResetTokenHash" TEXT;
ALTER TABLE "Administrator" ADD COLUMN "passwordResetTokenExpiresAt" TIMESTAMP(3);

-- Existing data: derive username from the email prefix, with the known superadmin username.
UPDATE "Administrator"
SET "username" = CASE
  WHEN lower(trim("email")) = 'admin@atico.local' THEN 'edelamora'
  ELSE regexp_replace(lower(split_part(trim("email"), '@', 1)), '[^a-z0-9._-]', '', 'g')
END
WHERE "username" IS NULL;

-- Fallback for any row with an empty derived username.
UPDATE "Administrator"
SET "username" = 'user-' || substring("id", 1, 8)
WHERE "username" IS NULL OR "username" = '';

ALTER TABLE "Administrator" ALTER COLUMN "username" SET NOT NULL;
ALTER TABLE "Administrator" ALTER COLUMN "email" DROP NOT NULL;

CREATE UNIQUE INDEX "Administrator_username_key" ON "Administrator"("username");
