-- Withdrawal reasons + Shopify order automation + Pro email/automation settings

-- AlterTable: WithdrawalRequest — reason + order automation tracking
ALTER TABLE "WithdrawalRequest" ADD COLUMN "reason" TEXT;
ALTER TABLE "WithdrawalRequest" ADD COLUMN "orderGid" TEXT;
ALTER TABLE "WithdrawalRequest" ADD COLUMN "orderCancelledAt" TIMESTAMP(3);
ALTER TABLE "WithdrawalRequest" ADD COLUMN "refundedAt" TIMESTAMP(3);

-- AlterTable: Settings — storefront reason toggle + Pro order automation toggles
ALTER TABLE "Settings" ADD COLUMN "collectReason" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "Settings" ADD COLUMN "autoCancelUnfulfilled" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Settings" ADD COLUMN "autoRefundOnProcess" BOOLEAN NOT NULL DEFAULT false;
