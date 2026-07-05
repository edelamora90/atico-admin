-- AlterTable
ALTER TABLE "Package" ADD COLUMN     "isTrial" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "requiresEnrollment" BOOLEAN NOT NULL DEFAULT true;
