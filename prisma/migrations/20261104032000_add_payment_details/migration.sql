-- Payment method, transaction reference, and an idempotency key so
-- a double-submitted form returns the original payment.
ALTER TABLE "Payment" ADD COLUMN "method" TEXT;
ALTER TABLE "Payment" ADD COLUMN "reference" TEXT;
ALTER TABLE "Payment" ADD COLUMN "idempotencyKey" TEXT;
CREATE UNIQUE INDEX "Payment_idempotencyKey_key" ON "Payment"("idempotencyKey");
