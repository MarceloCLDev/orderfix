-- CreateTable
CREATE TABLE "CashbackPromoPurchase" (
    "id" TEXT NOT NULL,
    "shop" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "kx" TEXT NOT NULL,
    "cashbackPromo" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CashbackPromoPurchase_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CashbackPromoPurchase_kx_idx" ON "CashbackPromoPurchase"("kx");

-- CreateIndex
CREATE UNIQUE INDEX "CashbackPromoPurchase_shop_orderId_key" ON "CashbackPromoPurchase"("shop", "orderId");
