-- CreateEnum
CREATE TYPE "ExpenseCategory" AS ENUM ('RENT', 'ELECTRICITY', 'WATER', 'PAYROLL', 'MAINTENANCE', 'CLEANING', 'MARKETING', 'STORE_SUPPLIES', 'EQUIPMENT', 'OTHER');

-- AlterTable
ALTER TABLE "Expense" ADD COLUMN "category" "ExpenseCategory" NOT NULL DEFAULT 'OTHER';
ALTER TABLE "Expense" ADD COLUMN "date" TIMESTAMP(3);
UPDATE "Expense" SET "date" = "createdAt" WHERE "date" IS NULL;
ALTER TABLE "Expense" ALTER COLUMN "date" SET NOT NULL;
ALTER TABLE "Expense" ADD COLUMN "updatedAt" TIMESTAMP(3);
UPDATE "Expense" SET "updatedAt" = "createdAt" WHERE "updatedAt" IS NULL;
ALTER TABLE "Expense" ALTER COLUMN "updatedAt" SET NOT NULL;
