-- CreateEnum
CREATE TYPE "PosSaleType" AS ENUM ('STORE', 'ACADEMIC', 'MIXED');

-- CreateEnum
CREATE TYPE "PosSaleItemType" AS ENUM ('ACADEMIC', 'INSCRIPTION', 'STORE');

-- CreateTable
CREATE TABLE "PosSale" (
    "id" TEXT NOT NULL,
    "saleType" "PosSaleType" NOT NULL,
    "studentId" TEXT,
    "total" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PosSale_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PosSaleItem" (
    "id" TEXT NOT NULL,
    "saleId" TEXT NOT NULL,
    "type" "PosSaleItemType" NOT NULL,
    "name" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unitPrice" DOUBLE PRECISION NOT NULL,
    "total" DOUBLE PRECISION NOT NULL,
    "packageId" TEXT,
    "productId" TEXT,
    "membershipId" TEXT,
    "storeSaleId" TEXT,
    "paymentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PosSaleItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PosSale_createdAt_idx" ON "PosSale"("createdAt");

-- CreateIndex
CREATE INDEX "PosSale_saleType_idx" ON "PosSale"("saleType");

-- CreateIndex
CREATE INDEX "PosSale_studentId_idx" ON "PosSale"("studentId");

-- CreateIndex
CREATE INDEX "PosSaleItem_saleId_idx" ON "PosSaleItem"("saleId");

-- CreateIndex
CREATE INDEX "PosSaleItem_type_idx" ON "PosSaleItem"("type");

-- CreateIndex
CREATE INDEX "PosSaleItem_packageId_idx" ON "PosSaleItem"("packageId");

-- CreateIndex
CREATE INDEX "PosSaleItem_productId_idx" ON "PosSaleItem"("productId");

-- CreateIndex
CREATE INDEX "PosSaleItem_membershipId_idx" ON "PosSaleItem"("membershipId");

-- CreateIndex
CREATE INDEX "PosSaleItem_storeSaleId_idx" ON "PosSaleItem"("storeSaleId");

-- CreateIndex
CREATE INDEX "PosSaleItem_paymentId_idx" ON "PosSaleItem"("paymentId");

-- AddForeignKey
ALTER TABLE "PosSale" ADD CONSTRAINT "PosSale_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PosSaleItem" ADD CONSTRAINT "PosSaleItem_saleId_fkey" FOREIGN KEY ("saleId") REFERENCES "PosSale"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PosSaleItem" ADD CONSTRAINT "PosSaleItem_packageId_fkey" FOREIGN KEY ("packageId") REFERENCES "Package"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PosSaleItem" ADD CONSTRAINT "PosSaleItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "StoreProduct"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PosSaleItem" ADD CONSTRAINT "PosSaleItem_membershipId_fkey" FOREIGN KEY ("membershipId") REFERENCES "Membership"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PosSaleItem" ADD CONSTRAINT "PosSaleItem_storeSaleId_fkey" FOREIGN KEY ("storeSaleId") REFERENCES "StoreSale"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PosSaleItem" ADD CONSTRAINT "PosSaleItem_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "Payment"("id") ON DELETE SET NULL ON UPDATE CASCADE;
