-- Expiring offline access tokens (session-storage-prisma v9 / Shopify 2027-01-01
-- requirement). Store the refresh token + its expiry so the short-lived offline
-- access token can be auto-refreshed without merchant interaction.
ALTER TABLE "Session" ADD COLUMN "refreshToken" TEXT;
ALTER TABLE "Session" ADD COLUMN "refreshTokenExpires" TIMESTAMP(3);
