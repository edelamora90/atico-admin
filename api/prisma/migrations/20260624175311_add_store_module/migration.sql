-- CreateTable
CREATE TABLE "StoreProduct" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "salePrice" DOUBLE PRECISION NOT NULL,
    "costPrice" DOUBLE PRECISION NOT NULL,
    "stock" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StoreProduct_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StoreSale" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unitPrice" DOUBLE PRECISION NOT NULL,
    "unitCost" DOUBLE PRECISION NOT NULL,
    "total" DOUBLE PRECISION NOT NULL,
    "profit" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StoreSale_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "StoreSale" ADD CONSTRAINT "StoreSale_productId_fkey" FOREIGN KEY ("productId") REFERENCES "StoreProduct"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
