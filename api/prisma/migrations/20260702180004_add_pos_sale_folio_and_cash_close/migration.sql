/*
  Warnings:

  - A unique constraint covering the columns `[folio]` on the table `PosSale` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "PosSale" ADD COLUMN     "folio" TEXT;

-- CreateTable
CREATE TABLE "CashRegisterClose" (
    "id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "from" TIMESTAMP(3) NOT NULL,
    "to" TIMESTAMP(3) NOT NULL,
    "expectedAmount" DOUBLE PRECISION NOT NULL,
    "countedAmount" DOUBLE PRECISION NOT NULL,
    "difference" DOUBLE PRECISION NOT NULL,
    "notes" TEXT,
    "closedByName" TEXT,
    "reviewedByName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CashRegisterClose_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CashRegisterClose_date_idx" ON "CashRegisterClose"("date");

-- CreateIndex
CREATE INDEX "CashRegisterClose_from_idx" ON "CashRegisterClose"("from");

-- CreateIndex
CREATE INDEX "CashRegisterClose_to_idx" ON "CashRegisterClose"("to");

-- CreateIndex
CREATE INDEX "CashRegisterClose_createdAt_idx" ON "CashRegisterClose"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "PosSale_folio_key" ON "PosSale"("folio");
