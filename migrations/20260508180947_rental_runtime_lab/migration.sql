/*
  Warnings:

  - You are about to drop the column `canCreateTodos` on the `Role` table. All the data in the column will be lost.
  - You are about to drop the column `canManageAllTodos` on the `Role` table. All the data in the column will be lost.
  - You are about to drop the `Todo` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `TodoImage` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `_Todo_todoImages` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "Todo" DROP CONSTRAINT "Todo_assignedTo_fkey";

-- DropForeignKey
ALTER TABLE "_Todo_todoImages" DROP CONSTRAINT "_Todo_todoImages_A_fkey";

-- DropForeignKey
ALTER TABLE "_Todo_todoImages" DROP CONSTRAINT "_Todo_todoImages_B_fkey";

-- AlterTable
ALTER TABLE "Role" DROP COLUMN "canCreateTodos",
DROP COLUMN "canManageAllTodos",
ADD COLUMN     "canManageAgreements" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "canManageCustomers" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "canManageInventory" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "canManageOnboarding" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "canManagePayments" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "canManageReports" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "canManageReservations" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "canReadAgreements" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "canReadCustomers" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "canReadInventory" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "canReadPayments" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "canReadReports" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "canReadReservations" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "isActive" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "onboardingStatus" TEXT DEFAULT 'not_started',
ADD COLUMN     "phone" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- DropTable
DROP TABLE "Todo";

-- DropTable
DROP TABLE "TodoImage";

-- DropTable
DROP TABLE "_Todo_todoImages";

-- CreateTable
CREATE TABLE "RentalCategory" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL DEFAULT '',
    "slug" TEXT NOT NULL DEFAULT '',
    "description" TEXT NOT NULL DEFAULT '',
    "status" TEXT DEFAULT 'active',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RentalCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RentalLocation" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL DEFAULT '',
    "code" TEXT NOT NULL DEFAULT '',
    "status" TEXT DEFAULT 'active',
    "address1" TEXT NOT NULL DEFAULT '',
    "address2" TEXT NOT NULL DEFAULT '',
    "city" TEXT NOT NULL DEFAULT '',
    "state" TEXT NOT NULL DEFAULT '',
    "postalCode" TEXT NOT NULL DEFAULT '',
    "phone" TEXT NOT NULL DEFAULT '',
    "email" TEXT NOT NULL DEFAULT '',
    "allowsPickup" BOOLEAN NOT NULL DEFAULT true,
    "allowsReturn" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RentalLocation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RentalItem" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL DEFAULT '',
    "slug" TEXT NOT NULL DEFAULT '',
    "sku" TEXT NOT NULL DEFAULT '',
    "description" TEXT NOT NULL DEFAULT '',
    "status" TEXT NOT NULL DEFAULT 'draft',
    "itemType" TEXT DEFAULT 'equipment',
    "dailyRate" INTEGER DEFAULT 0,
    "hourlyRate" INTEGER,
    "depositAmount" INTEGER DEFAULT 0,
    "currencyCode" TEXT NOT NULL DEFAULT 'USD',
    "minimumRentalHours" INTEGER DEFAULT 24,
    "turnaroundMinutes" INTEGER DEFAULT 60,
    "isBookableOnline" BOOLEAN NOT NULL DEFAULT true,
    "category" TEXT,
    "homeLocation" TEXT,
    "make" TEXT NOT NULL DEFAULT '',
    "model" TEXT NOT NULL DEFAULT '',
    "year" INTEGER,
    "serialNumber" TEXT NOT NULL DEFAULT '',
    "licensePlate" TEXT NOT NULL DEFAULT '',
    "capacity" INTEGER,
    "features" JSONB,
    "notes" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RentalItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RentalCustomer" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL DEFAULT '',
    "email" TEXT NOT NULL DEFAULT '',
    "phone" TEXT NOT NULL DEFAULT '',
    "user" TEXT,
    "verificationStatus" TEXT DEFAULT 'unverified',
    "driverLicenseNumber" TEXT NOT NULL DEFAULT '',
    "driverLicenseState" TEXT NOT NULL DEFAULT '',
    "isTaxExempt" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RentalCustomer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RentalReservation" (
    "id" TEXT NOT NULL,
    "reservationNumber" TEXT NOT NULL DEFAULT '',
    "bookingToken" TEXT NOT NULL DEFAULT '',
    "status" TEXT NOT NULL DEFAULT 'draft',
    "item" TEXT,
    "customer" TEXT,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3) NOT NULL,
    "pickupLocation" TEXT,
    "returnLocation" TEXT,
    "subtotalAmount" INTEGER DEFAULT 0,
    "taxAmount" INTEGER DEFAULT 0,
    "feeAmount" INTEGER DEFAULT 0,
    "discountAmount" INTEGER DEFAULT 0,
    "depositAmount" INTEGER DEFAULT 0,
    "totalAmount" INTEGER DEFAULT 0,
    "amountPaid" INTEGER DEFAULT 0,
    "currencyCode" TEXT NOT NULL DEFAULT 'USD',
    "source" TEXT DEFAULT 'operator',
    "pickupNotes" TEXT NOT NULL DEFAULT '',
    "returnNotes" TEXT NOT NULL DEFAULT '',
    "extensionRequestedUntil" TIMESTAMP(3),
    "extensionRequestNotes" TEXT NOT NULL DEFAULT '',
    "internalNotes" TEXT NOT NULL DEFAULT '',
    "pricingBreakdown" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RentalReservation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AvailabilityBlock" (
    "id" TEXT NOT NULL,
    "item" TEXT,
    "reservation" TEXT,
    "reason" TEXT DEFAULT 'owner_block',
    "status" TEXT DEFAULT 'active',
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3) NOT NULL,
    "notes" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AvailabilityBlock_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RentalAgreement" (
    "id" TEXT NOT NULL,
    "agreementNumber" TEXT NOT NULL DEFAULT '',
    "signingToken" TEXT NOT NULL DEFAULT '',
    "signerEmail" TEXT NOT NULL DEFAULT '',
    "termsVersion" TEXT NOT NULL DEFAULT 'rental-standard-v1',
    "status" TEXT DEFAULT 'draft',
    "reservation" TEXT,
    "customer" TEXT,
    "title" TEXT NOT NULL DEFAULT 'Rental Agreement',
    "body" TEXT NOT NULL DEFAULT '',
    "signatureName" TEXT NOT NULL DEFAULT '',
    "signatureIp" TEXT NOT NULL DEFAULT '',
    "signedUserAgent" TEXT NOT NULL DEFAULT '',
    "signedAt" TIMESTAMP(3),
    "requiresInsuranceProof" BOOLEAN NOT NULL DEFAULT false,
    "insuranceVerified" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RentalAgreement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Payment" (
    "id" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "currencyCode" TEXT NOT NULL DEFAULT 'USD',
    "status" TEXT DEFAULT 'pending',
    "paymentMethod" TEXT DEFAULT 'credit_card',
    "provider" TEXT NOT NULL DEFAULT '',
    "paymentProvider" TEXT,
    "providerPaymentId" TEXT NOT NULL DEFAULT '',
    "data" JSONB,
    "processedAt" TIMESTAMP(3),
    "errorMessage" TEXT NOT NULL DEFAULT '',
    "reservation" TEXT,
    "customer" TEXT,
    "processedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentProvider" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL DEFAULT '',
    "code" TEXT NOT NULL DEFAULT '',
    "isInstalled" BOOLEAN NOT NULL DEFAULT true,
    "credentials" JSONB DEFAULT '{}',
    "metadata" JSONB DEFAULT '{}',
    "createPaymentFunction" TEXT NOT NULL DEFAULT 'manual',
    "capturePaymentFunction" TEXT NOT NULL DEFAULT 'manual',
    "refundPaymentFunction" TEXT NOT NULL DEFAULT 'manual',
    "getPaymentStatusFunction" TEXT NOT NULL DEFAULT 'manual',
    "generatePaymentLinkFunction" TEXT NOT NULL DEFAULT 'manual',
    "handleWebhookFunction" TEXT NOT NULL DEFAULT 'manual',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PaymentProvider_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RentalFee" (
    "id" TEXT NOT NULL,
    "label" TEXT NOT NULL DEFAULT '',
    "type" TEXT DEFAULT 'adjustment',
    "status" TEXT DEFAULT 'approved',
    "amount" INTEGER NOT NULL,
    "currencyCode" TEXT NOT NULL DEFAULT 'USD',
    "description" TEXT NOT NULL DEFAULT '',
    "reservation" TEXT,
    "item" TEXT,
    "customer" TEXT,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RentalFee_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "RentalCategory_slug_key" ON "RentalCategory"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "RentalLocation_code_key" ON "RentalLocation"("code");

-- CreateIndex
CREATE UNIQUE INDEX "RentalItem_slug_key" ON "RentalItem"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "RentalItem_sku_key" ON "RentalItem"("sku");

-- CreateIndex
CREATE INDEX "RentalItem_category_idx" ON "RentalItem"("category");

-- CreateIndex
CREATE INDEX "RentalItem_homeLocation_idx" ON "RentalItem"("homeLocation");

-- CreateIndex
CREATE UNIQUE INDEX "RentalCustomer_user_key" ON "RentalCustomer"("user");

-- CreateIndex
CREATE UNIQUE INDEX "RentalReservation_reservationNumber_key" ON "RentalReservation"("reservationNumber");

-- CreateIndex
CREATE UNIQUE INDEX "RentalReservation_bookingToken_key" ON "RentalReservation"("bookingToken");

-- CreateIndex
CREATE INDEX "RentalReservation_item_idx" ON "RentalReservation"("item");

-- CreateIndex
CREATE INDEX "RentalReservation_customer_idx" ON "RentalReservation"("customer");

-- CreateIndex
CREATE INDEX "RentalReservation_pickupLocation_idx" ON "RentalReservation"("pickupLocation");

-- CreateIndex
CREATE INDEX "RentalReservation_returnLocation_idx" ON "RentalReservation"("returnLocation");

-- CreateIndex
CREATE UNIQUE INDEX "AvailabilityBlock_reservation_key" ON "AvailabilityBlock"("reservation");

-- CreateIndex
CREATE INDEX "AvailabilityBlock_item_idx" ON "AvailabilityBlock"("item");

-- CreateIndex
CREATE UNIQUE INDEX "RentalAgreement_agreementNumber_key" ON "RentalAgreement"("agreementNumber");

-- CreateIndex
CREATE UNIQUE INDEX "RentalAgreement_signingToken_key" ON "RentalAgreement"("signingToken");

-- CreateIndex
CREATE INDEX "RentalAgreement_reservation_idx" ON "RentalAgreement"("reservation");

-- CreateIndex
CREATE INDEX "RentalAgreement_customer_idx" ON "RentalAgreement"("customer");

-- CreateIndex
CREATE INDEX "Payment_paymentProvider_idx" ON "Payment"("paymentProvider");

-- CreateIndex
CREATE INDEX "Payment_reservation_idx" ON "Payment"("reservation");

-- CreateIndex
CREATE INDEX "Payment_customer_idx" ON "Payment"("customer");

-- CreateIndex
CREATE INDEX "Payment_processedBy_idx" ON "Payment"("processedBy");

-- CreateIndex
CREATE UNIQUE INDEX "PaymentProvider_code_key" ON "PaymentProvider"("code");

-- CreateIndex
CREATE INDEX "RentalFee_reservation_idx" ON "RentalFee"("reservation");

-- CreateIndex
CREATE INDEX "RentalFee_item_idx" ON "RentalFee"("item");

-- CreateIndex
CREATE INDEX "RentalFee_customer_idx" ON "RentalFee"("customer");

-- CreateIndex
CREATE INDEX "RentalFee_createdBy_idx" ON "RentalFee"("createdBy");

-- AddForeignKey
ALTER TABLE "RentalItem" ADD CONSTRAINT "RentalItem_category_fkey" FOREIGN KEY ("category") REFERENCES "RentalCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RentalItem" ADD CONSTRAINT "RentalItem_homeLocation_fkey" FOREIGN KEY ("homeLocation") REFERENCES "RentalLocation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RentalCustomer" ADD CONSTRAINT "RentalCustomer_user_fkey" FOREIGN KEY ("user") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RentalReservation" ADD CONSTRAINT "RentalReservation_item_fkey" FOREIGN KEY ("item") REFERENCES "RentalItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RentalReservation" ADD CONSTRAINT "RentalReservation_customer_fkey" FOREIGN KEY ("customer") REFERENCES "RentalCustomer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RentalReservation" ADD CONSTRAINT "RentalReservation_pickupLocation_fkey" FOREIGN KEY ("pickupLocation") REFERENCES "RentalLocation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RentalReservation" ADD CONSTRAINT "RentalReservation_returnLocation_fkey" FOREIGN KEY ("returnLocation") REFERENCES "RentalLocation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AvailabilityBlock" ADD CONSTRAINT "AvailabilityBlock_item_fkey" FOREIGN KEY ("item") REFERENCES "RentalItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AvailabilityBlock" ADD CONSTRAINT "AvailabilityBlock_reservation_fkey" FOREIGN KEY ("reservation") REFERENCES "RentalReservation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RentalAgreement" ADD CONSTRAINT "RentalAgreement_reservation_fkey" FOREIGN KEY ("reservation") REFERENCES "RentalReservation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RentalAgreement" ADD CONSTRAINT "RentalAgreement_customer_fkey" FOREIGN KEY ("customer") REFERENCES "RentalCustomer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_paymentProvider_fkey" FOREIGN KEY ("paymentProvider") REFERENCES "PaymentProvider"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_reservation_fkey" FOREIGN KEY ("reservation") REFERENCES "RentalReservation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_customer_fkey" FOREIGN KEY ("customer") REFERENCES "RentalCustomer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_processedBy_fkey" FOREIGN KEY ("processedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RentalFee" ADD CONSTRAINT "RentalFee_reservation_fkey" FOREIGN KEY ("reservation") REFERENCES "RentalReservation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RentalFee" ADD CONSTRAINT "RentalFee_item_fkey" FOREIGN KEY ("item") REFERENCES "RentalItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RentalFee" ADD CONSTRAINT "RentalFee_customer_fkey" FOREIGN KEY ("customer") REFERENCES "RentalCustomer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RentalFee" ADD CONSTRAINT "RentalFee_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
