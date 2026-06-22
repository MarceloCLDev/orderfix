-- CreateTable
CREATE TABLE "OrderFixEvent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shop" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE INDEX "OrderFixEvent_shop_idx" ON "OrderFixEvent"("shop");

-- CreateIndex
CREATE INDEX "OrderFixEvent_shop_type_idx" ON "OrderFixEvent"("shop", "type");

-- CreateIndex
CREATE INDEX "OrderFixEvent_shop_createdAt_idx" ON "OrderFixEvent"("shop", "createdAt");
