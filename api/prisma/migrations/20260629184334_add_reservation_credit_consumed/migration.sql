-- AlterTable
ALTER TABLE "Reservation" ADD COLUMN     "creditConsumed" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "creditMembershipId" TEXT;
