-- Storefront order validation + merchant decision note + editable decision-email templates

-- AlterTable: Settings — strict order validation toggle + decision-email templates
ALTER TABLE "Settings" ADD COLUMN "requireValidOrder" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Settings" ADD COLUMN "emailProcessedSubject" TEXT;
ALTER TABLE "Settings" ADD COLUMN "emailProcessedBody" TEXT;
ALTER TABLE "Settings" ADD COLUMN "emailRejectedSubject" TEXT;
ALTER TABLE "Settings" ADD COLUMN "emailRejectedBody" TEXT;

-- AlterTable: WithdrawalRequest — merchant's decision reason/note
ALTER TABLE "WithdrawalRequest" ADD COLUMN "decisionNote" TEXT;
