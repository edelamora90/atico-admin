-- CreateEnum
CREATE TYPE "PackageType" AS ENUM ('PACKAGE', 'PROMOTION', 'TRIAL', 'DAY_PASS');

-- AlterTable
ALTER TABLE "Package" ADD COLUMN     "type" "PackageType" NOT NULL DEFAULT 'PACKAGE';
