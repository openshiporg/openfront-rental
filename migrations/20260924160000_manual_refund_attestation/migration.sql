-- Manual reconciliation must not invent a provider refund identifier.
-- Existing references are preserved; future manual liabilities/attestations may leave this nullable.
ALTER TABLE "Refund" ALTER COLUMN "providerRefundId" DROP NOT NULL;
ALTER TABLE "Refund" ALTER COLUMN "providerRefundId" DROP DEFAULT;
