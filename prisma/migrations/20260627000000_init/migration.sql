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
    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Settings" (
    "id" TEXT NOT NULL,
    "shop" TEXT NOT NULL,
    "buttonMode" TEXT NOT NULL DEFAULT 'FOOTER',
    "buttonLabel" TEXT,
    "defaultLocale" TEXT NOT NULL DEFAULT 'en',
    "formTitle" TEXT,
    "formIntro" TEXT,
    "itemsFieldLabel" TEXT,
    "itemsFieldHelp" TEXT,
    "withdrawalDays" INTEGER NOT NULL DEFAULT 14,
    "excludedNote" TEXT,
    "brandColor" TEXT NOT NULL DEFAULT '#1A1A1A',
    "accentColor" TEXT NOT NULL DEFAULT '#2563EB',
    "showWatermark" BOOLEAN NOT NULL DEFAULT false,
    "logoUrl" TEXT,
    "emailFrom" TEXT,
    "emailReplyTo" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WithdrawalRequest" (
    "id" TEXT NOT NULL,
    "shop" TEXT NOT NULL,
    "customerName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "orderRef" TEXT,
    "itemsDescription" TEXT,
    "locale" TEXT NOT NULL DEFAULT 'en',
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "confirmationSentAt" TIMESTAMP(3),
    "pdfGeneratedAt" TIMESTAMP(3),
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "WithdrawalRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditEvent" (
    "id" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "payloadJson" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AuditEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShopSubscription" (
    "id" TEXT NOT NULL,
    "shop" TEXT NOT NULL,
    "plan" TEXT NOT NULL DEFAULT 'FREE',
    "subscriptionId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ShopSubscription_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Settings_shop_key" ON "Settings"("shop");
CREATE INDEX "Settings_shop_idx" ON "Settings"("shop");
CREATE INDEX "WithdrawalRequest_shop_idx" ON "WithdrawalRequest"("shop");
CREATE INDEX "WithdrawalRequest_shop_status_idx" ON "WithdrawalRequest"("shop", "status");
CREATE INDEX "WithdrawalRequest_createdAt_idx" ON "WithdrawalRequest"("createdAt");
CREATE INDEX "AuditEvent_requestId_idx" ON "AuditEvent"("requestId");
CREATE UNIQUE INDEX "ShopSubscription_shop_key" ON "ShopSubscription"("shop");
CREATE INDEX "ShopSubscription_shop_idx" ON "ShopSubscription"("shop");

-- AddForeignKey
ALTER TABLE "AuditEvent" ADD CONSTRAINT "AuditEvent_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "WithdrawalRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;
