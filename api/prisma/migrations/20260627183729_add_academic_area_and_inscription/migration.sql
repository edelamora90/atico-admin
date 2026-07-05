-- CreateEnum
CREATE TYPE "AcademicArea" AS ENUM ('DANCE', 'MUSIC', 'BOTH');

-- AlterTable
ALTER TABLE "Package" ADD COLUMN     "area" "AcademicArea" NOT NULL DEFAULT 'DANCE';

-- AlterTable
ALTER TABLE "Student" ADD COLUMN     "academicArea" "AcademicArea" NOT NULL DEFAULT 'DANCE',
ADD COLUMN     "inscriptionAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "inscriptionPaid" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "trialClassAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "trialClassPaid" BOOLEAN NOT NULL DEFAULT false;
