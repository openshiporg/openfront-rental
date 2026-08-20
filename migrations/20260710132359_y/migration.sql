/*
  Warnings:

  - A unique constraint covering the columns `[signingTokenHash]` on the table `RentalAgreement` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[bookingTokenHash]` on the table `RentalReservation` will be added. If there are existing duplicate values, this will fail.

*/
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- DropIndex
DROP INDEX "RentalAgreement_signingToken_key";

-- DropIndex
DROP INDEX "RentalReservation_bookingToken_key";

-- AlterTable
ALTER TABLE "RentalAgreement" ADD COLUMN     "signingTokenExpiresAt" TIMESTAMP(3),
ADD COLUMN     "signingTokenHash" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "signingTokenRevokedAt" TIMESTAMP(3);

-- Backfill existing raw tokens before removing their unique indexes.
UPDATE "RentalAgreement"
SET "signingTokenHash" = encode(digest("signingToken", 'sha256'), 'hex'),
    "signingTokenExpiresAt" = CURRENT_TIMESTAMP + INTERVAL '30 days';

-- AlterTable
ALTER TABLE "RentalReservation" ADD COLUMN     "bookingTokenExpiresAt" TIMESTAMP(3),
ADD COLUMN     "bookingTokenHash" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "bookingTokenRevokedAt" TIMESTAMP(3);

-- Backfill existing raw tokens before removing their unique indexes.
UPDATE "RentalReservation"
SET "bookingTokenHash" = encode(digest("bookingToken", 'sha256'), 'hex'),
    "bookingTokenExpiresAt" = CURRENT_TIMESTAMP + INTERVAL '30 days';

-- Retire raw stored token values after their hashes are persisted.
UPDATE "RentalAgreement" SET "signingToken" = 'retired-agreement-' || "id";
UPDATE "RentalReservation" SET "bookingToken" = 'retired-booking-' || "id";

-- CreateIndex
CREATE UNIQUE INDEX "RentalAgreement_signingTokenHash_key" ON "RentalAgreement"("signingTokenHash");

-- CreateIndex
CREATE UNIQUE INDEX "RentalReservation_bookingTokenHash_key" ON "RentalReservation"("bookingTokenHash");
