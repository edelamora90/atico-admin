/*
  Warnings:

  - Made the column `recurrenceType` on table `Class` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "Class" ALTER COLUMN "recurrenceType" SET NOT NULL,
ALTER COLUMN "recurrenceStart" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "recurrenceEnd" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "ClassSession" ALTER COLUMN "date" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "createdAt" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "updatedAt" DROP DEFAULT,
ALTER COLUMN "updatedAt" SET DATA TYPE TIMESTAMP(3);
