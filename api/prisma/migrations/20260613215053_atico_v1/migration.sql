/*
  Warnings:

  - The values [PROXIMO_VENCER,SIN_CREDITOS] on the enum `StudentStatus` will be removed. If these variants are still used in the database, this will fail.
  - The values [MAESTRO] on the enum `UserRole` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the column `name` on the `Class` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `Class` table. All the data in the column will be lost.
  - You are about to drop the column `creditsAvailable` on the `Student` table. All the data in the column will be lost.
  - You are about to drop the column `membershipEnd` on the `Student` table. All the data in the column will be lost.
  - You are about to drop the column `membershipStart` on the `Student` table. All the data in the column will be lost.
  - You are about to drop the `Rental` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `courseId` to the `Class` table without a default value. This is not possible if the table is not empty.
  - Added the required column `durationMinutes` to the `Class` table without a default value. This is not possible if the table is not empty.
  - Added the required column `roomId` to the `Class` table without a default value. This is not possible if the table is not empty.
  - Added the required column `teacherId` to the `Class` table without a default value. This is not possible if the table is not empty.
  - Changed the type of `concept` on the `Payment` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- CreateEnum
CREATE TYPE "ReservationStatus" AS ENUM ('RESERVED', 'CONFIRMED', 'WAITING_LIST', 'RELEASED', 'CANCELLED', 'ATTENDED', 'NO_SHOW');

-- CreateEnum
CREATE TYPE "AttendanceStatus" AS ENUM ('PRESENT', 'ABSENT', 'NO_SHOW');

-- CreateEnum
CREATE TYPE "PaymentConcept" AS ENUM ('INSCRIPCION', 'PAQUETE', 'DAY_PASS', 'EVENTO', 'CURSO', 'RENTA', 'CAFETERIA');

-- CreateEnum
CREATE TYPE "CreditTransactionType" AS ENUM ('PURCHASE', 'CLASS_USE', 'ADJUSTMENT', 'EXPIRATION');

-- AlterEnum
BEGIN;
CREATE TYPE "StudentStatus_new" AS ENUM ('ACTIVO', 'INACTIVO', 'BLOQUEADO');
ALTER TABLE "public"."Student" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "Student" ALTER COLUMN "status" TYPE "StudentStatus_new" USING ("status"::text::"StudentStatus_new");
ALTER TYPE "StudentStatus" RENAME TO "StudentStatus_old";
ALTER TYPE "StudentStatus_new" RENAME TO "StudentStatus";
DROP TYPE "public"."StudentStatus_old";
ALTER TABLE "Student" ALTER COLUMN "status" SET DEFAULT 'ACTIVO';
COMMIT;

-- AlterEnum
BEGIN;
CREATE TYPE "UserRole_new" AS ENUM ('SUPER_ADMIN', 'ADMIN', 'RECEPCION');
ALTER TABLE "Administrator" ALTER COLUMN "role" TYPE "UserRole_new" USING ("role"::text::"UserRole_new");
ALTER TYPE "UserRole" RENAME TO "UserRole_old";
ALTER TYPE "UserRole_new" RENAME TO "UserRole";
DROP TYPE "public"."UserRole_old";
COMMIT;

-- AlterTable
ALTER TABLE "Class" DROP COLUMN "name",
DROP COLUMN "updatedAt",
ADD COLUMN     "courseId" TEXT NOT NULL,
ADD COLUMN     "durationMinutes" INTEGER NOT NULL,
ADD COLUMN     "roomId" TEXT NOT NULL,
ADD COLUMN     "teacherId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "Payment" ADD COLUMN     "notes" TEXT,
ADD COLUMN     "studentId" TEXT,
DROP COLUMN "concept",
ADD COLUMN     "concept" "PaymentConcept" NOT NULL;

-- AlterTable
ALTER TABLE "Student" DROP COLUMN "creditsAvailable",
DROP COLUMN "membershipEnd",
DROP COLUMN "membershipStart";

-- AlterTable
ALTER TABLE "Teacher" ADD COLUMN     "active" BOOLEAN NOT NULL DEFAULT true;

-- DropTable
DROP TABLE "Rental";

-- CreateTable
CREATE TABLE "Membership" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "packageId" TEXT NOT NULL,
    "initialCredits" INTEGER NOT NULL,
    "availableCredits" INTEGER NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "expirationDate" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Membership_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CreditTransaction" (
    "id" TEXT NOT NULL,
    "membershipId" TEXT NOT NULL,
    "type" "CreditTransactionType" NOT NULL,
    "amount" INTEGER NOT NULL,
    "description" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CreditTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Course" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Course_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Room" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "capacity" INTEGER NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Room_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Reservation" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "classId" TEXT NOT NULL,
    "status" "ReservationStatus" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Reservation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Attendance" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "classId" TEXT NOT NULL,
    "status" "AttendanceStatus" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Attendance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Expense" (
    "id" TEXT NOT NULL,
    "concept" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Expense_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Event" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "eventDate" TIMESTAMP(3) NOT NULL,
    "price" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Event_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RoomReservation" (
    "id" TEXT NOT NULL,
    "customerName" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RoomReservation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Membership" ADD CONSTRAINT "Membership_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Membership" ADD CONSTRAINT "Membership_packageId_fkey" FOREIGN KEY ("packageId") REFERENCES "Package"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CreditTransaction" ADD CONSTRAINT "CreditTransaction_membershipId_fkey" FOREIGN KEY ("membershipId") REFERENCES "Membership"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Class" ADD CONSTRAINT "Class_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Class" ADD CONSTRAINT "Class_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "Teacher"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Class" ADD CONSTRAINT "Class_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "Room"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reservation" ADD CONSTRAINT "Reservation_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reservation" ADD CONSTRAINT "Reservation_classId_fkey" FOREIGN KEY ("classId") REFERENCES "Class"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attendance" ADD CONSTRAINT "Attendance_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attendance" ADD CONSTRAINT "Attendance_classId_fkey" FOREIGN KEY ("classId") REFERENCES "Class"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoomReservation" ADD CONSTRAINT "RoomReservation_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "Room"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
