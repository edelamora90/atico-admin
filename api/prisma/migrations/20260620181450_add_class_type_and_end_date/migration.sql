-- CreateEnum
CREATE TYPE "ClassType" AS ENUM ('CLASS', 'COURSE');

-- AlterTable
ALTER TABLE "Class" ADD COLUMN     "endDate" TIMESTAMP(3),
ADD COLUMN     "type" "ClassType" NOT NULL DEFAULT 'CLASS';
