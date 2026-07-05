-- CreateEnum
CREATE TYPE "RenewalPolicy" AS ENUM ('BY_MEMBERSHIP_EXPIRATION', 'BY_CREDITS_DEPLETION');

-- AlterEnum
ALTER TYPE "PaymentConcept" ADD VALUE 'RENEWAL';

-- AlterEnum
ALTER TYPE "PosSaleItemType" ADD VALUE 'RENEWAL';

-- CreateTable
CREATE TABLE "BusinessSettings" (
  "id" TEXT NOT NULL,
  "renewalPolicy" "RenewalPolicy" NOT NULL DEFAULT 'BY_MEMBERSHIP_EXPIRATION',
  "renewalGraceDays" INTEGER NOT NULL DEFAULT 15,
  "renewalFeeAmount" DOUBLE PRECISION NOT NULL DEFAULT 100,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "BusinessSettings_pkey" PRIMARY KEY ("id")
);

-- Seed default singleton row.
INSERT INTO "BusinessSettings" ("id", "renewalPolicy", "renewalGraceDays", "renewalFeeAmount", "updatedAt")
SELECT 'default', 'BY_MEMBERSHIP_EXPIRATION', 15, 100, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM "BusinessSettings");
