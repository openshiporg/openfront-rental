-- Make provider payment identifiers safe for mutation-level idempotency.
UPDATE "Payment"
SET "providerPaymentId" = id
WHERE "providerPaymentId" = '';

CREATE UNIQUE INDEX "Payment_providerPaymentId_key" ON "Payment"("providerPaymentId");
