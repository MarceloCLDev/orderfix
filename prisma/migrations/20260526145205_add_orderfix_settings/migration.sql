-- CreateTable
CREATE TABLE "OrderFixSettings" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shop" TEXT NOT NULL,
    "editWindowMinutes" INTEGER NOT NULL DEFAULT 30,
    "allowUntilShipped" BOOLEAN NOT NULL DEFAULT true,
    "allowAddressEdit" BOOLEAN NOT NULL DEFAULT true,
    "allowCancel" BOOLEAN NOT NULL DEFAULT true,
    "allowAddProducts" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "OrderFixSettings_shop_key" ON "OrderFixSettings"("shop");
