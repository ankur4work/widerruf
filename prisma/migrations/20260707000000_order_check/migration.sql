-- Store the order+email verification result so the merchant can see if a request
-- references a real order (spam / false-claim visibility).
ALTER TABLE "WithdrawalRequest" ADD COLUMN "orderCheck" TEXT;
