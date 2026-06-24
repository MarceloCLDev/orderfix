-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "shop" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "isOnline" BOOLEAN NOT NULL DEFAULT false,
    "scope" TEXT,
    "expires" TIMESTAMP(3),
    "accessToken" TEXT NOT NULL,
    "userId" BIGINT,
    "firstName" TEXT,
    "lastName" TEXT,
    "email" TEXT,
    "accountOwner" BOOLEAN NOT NULL DEFAULT false,
    "locale" TEXT,
    "collaborator" BOOLEAN DEFAULT false,
    "emailVerified" BOOLEAN DEFAULT false,
    "refreshToken" TEXT,
    "refreshTokenExpires" TIMESTAMP(3),

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrderFixSettings" (
    "id" TEXT NOT NULL,
    "shop" TEXT NOT NULL,
    "editWindowMinutes" INTEGER NOT NULL DEFAULT 30,
    "allowUntilShipped" BOOLEAN NOT NULL DEFAULT true,
    "allowAddressEdit" BOOLEAN NOT NULL DEFAULT true,
    "allowCancel" BOOLEAN NOT NULL DEFAULT true,
    "allowAddProducts" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OrderFixSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrderFixEvent" (
    "id" TEXT NOT NULL,
    "shop" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OrderFixEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "OrderFixSettings_shop_key" ON "OrderFixSettings"("shop");

-- CreateIndex
CREATE INDEX "OrderFixEvent_shop_idx" ON "OrderFixEvent"("shop");

-- CreateIndex
CREATE INDEX "OrderFixEvent_shop_type_idx" ON "OrderFixEvent"("shop", "type");

-- CreateIndex
CREATE INDEX "OrderFixEvent_shop_createdAt_idx" ON "OrderFixEvent"("shop", "createdAt");
