-- CreateEnum
CREATE TYPE "MembershipStatus" AS ENUM ('ACTIVE', 'CANCELLED', 'EXPIRED');

-- AlterEnum
ALTER TYPE "CreditTransactionType" ADD VALUE 'CANCELLATION';

-- AlterTable
ALTER TABLE "Membership" ADD COLUMN     "cancellationReason" TEXT,
ADD COLUMN     "cancelledAt" TIMESTAMP(3),
ADD COLUMN     "status" "MembershipStatus" NOT NULL DEFAULT 'ACTIVE';
