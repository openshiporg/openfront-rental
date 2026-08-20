/*
  Warnings:

  - You are about to drop the column `amount` on the `Payment` table. All the data in the column will be lost.
  - You are about to drop the column `customer` on the `Payment` table. All the data in the column will be lost.
  - You are about to drop the column `capturePaymentFunction` on the `PaymentProvider` table. All the data in the column will be lost.
  - You are about to drop the column `createPaymentFunction` on the `PaymentProvider` table. All the data in the column will be lost.
  - You are about to drop the column `credentials` on the `PaymentProvider` table. All the data in the column will be lost.
  - You are about to drop the column `generatePaymentLinkFunction` on the `PaymentProvider` table. All the data in the column will be lost.
  - You are about to drop the column `getPaymentStatusFunction` on the `PaymentProvider` table. All the data in the column will be lost.
  - You are about to drop the column `handleWebhookFunction` on the `PaymentProvider` table. All the data in the column will be lost.
  - You are about to drop the column `refundPaymentFunction` on the `PaymentProvider` table. All the data in the column will be lost.
  - You are about to drop the column `canManageAgreements` on the `Role` table. All the data in the column will be lost.
  - You are about to drop the column `canManageCustomers` on the `Role` table. All the data in the column will be lost.
  - You are about to drop the column `canManageInventory` on the `Role` table. All the data in the column will be lost.
  - You are about to drop the column `canReadAgreements` on the `Role` table. All the data in the column will be lost.
  - You are about to drop the column `canReadCustomers` on the `Role` table. All the data in the column will be lost.
  - You are about to drop the column `canReadInventory` on the `Role` table. All the data in the column will be lost.
  - You are about to drop the `AvailabilityBlock` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `AvailabilityCalendar` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `DamageReport` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `DeliveryTask` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Deposit` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Inspection` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `InsurancePolicy` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `LateFee` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `MaintenanceTicket` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `PickupReturn` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `PricingRule` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `RentalAgreement` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `RentalAsset` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `RentalBusinessSettings` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `RentalCategory` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `RentalContract` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `RentalCustomer` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `RentalFee` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `RentalItem` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `RentalItemImage` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `RentalLocation` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `RentalReservation` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `_RentalItem_images` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[idempotencyKey]` on the table `Payment` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[hostOrganization,code]` on the table `PaymentProvider` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `amountCents` to the `Payment` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "AvailabilityBlock" DROP CONSTRAINT "AvailabilityBlock_item_fkey";

-- DropForeignKey
ALTER TABLE "AvailabilityBlock" DROP CONSTRAINT "AvailabilityBlock_reservation_fkey";

-- DropForeignKey
ALTER TABLE "AvailabilityCalendar" DROP CONSTRAINT "AvailabilityCalendar_item_fkey";

-- DropForeignKey
ALTER TABLE "AvailabilityCalendar" DROP CONSTRAINT "AvailabilityCalendar_location_fkey";

-- DropForeignKey
ALTER TABLE "DamageReport" DROP CONSTRAINT "DamageReport_inspection_fkey";

-- DropForeignKey
ALTER TABLE "DamageReport" DROP CONSTRAINT "DamageReport_item_fkey";

-- DropForeignKey
ALTER TABLE "DamageReport" DROP CONSTRAINT "DamageReport_reservation_fkey";

-- DropForeignKey
ALTER TABLE "DeliveryTask" DROP CONSTRAINT "DeliveryTask_driver_fkey";

-- DropForeignKey
ALTER TABLE "DeliveryTask" DROP CONSTRAINT "DeliveryTask_item_fkey";

-- DropForeignKey
ALTER TABLE "DeliveryTask" DROP CONSTRAINT "DeliveryTask_reservation_fkey";

-- DropForeignKey
ALTER TABLE "Deposit" DROP CONSTRAINT "Deposit_customer_fkey";

-- DropForeignKey
ALTER TABLE "Deposit" DROP CONSTRAINT "Deposit_reservation_fkey";

-- DropForeignKey
ALTER TABLE "Inspection" DROP CONSTRAINT "Inspection_inspectedBy_fkey";

-- DropForeignKey
ALTER TABLE "Inspection" DROP CONSTRAINT "Inspection_item_fkey";

-- DropForeignKey
ALTER TABLE "Inspection" DROP CONSTRAINT "Inspection_reservation_fkey";

-- DropForeignKey
ALTER TABLE "InsurancePolicy" DROP CONSTRAINT "InsurancePolicy_customer_fkey";

-- DropForeignKey
ALTER TABLE "InsurancePolicy" DROP CONSTRAINT "InsurancePolicy_reservation_fkey";

-- DropForeignKey
ALTER TABLE "LateFee" DROP CONSTRAINT "LateFee_customer_fkey";

-- DropForeignKey
ALTER TABLE "LateFee" DROP CONSTRAINT "LateFee_reservation_fkey";

-- DropForeignKey
ALTER TABLE "MaintenanceTicket" DROP CONSTRAINT "MaintenanceTicket_damageReport_fkey";

-- DropForeignKey
ALTER TABLE "MaintenanceTicket" DROP CONSTRAINT "MaintenanceTicket_item_fkey";

-- DropForeignKey
ALTER TABLE "Payment" DROP CONSTRAINT "Payment_customer_fkey";

-- DropForeignKey
ALTER TABLE "Payment" DROP CONSTRAINT "Payment_reservation_fkey";

-- DropForeignKey
ALTER TABLE "PickupReturn" DROP CONSTRAINT "PickupReturn_customer_fkey";

-- DropForeignKey
ALTER TABLE "PickupReturn" DROP CONSTRAINT "PickupReturn_item_fkey";

-- DropForeignKey
ALTER TABLE "PickupReturn" DROP CONSTRAINT "PickupReturn_location_fkey";

-- DropForeignKey
ALTER TABLE "PickupReturn" DROP CONSTRAINT "PickupReturn_reservation_fkey";

-- DropForeignKey
ALTER TABLE "PricingRule" DROP CONSTRAINT "PricingRule_category_fkey";

-- DropForeignKey
ALTER TABLE "PricingRule" DROP CONSTRAINT "PricingRule_item_fkey";

-- DropForeignKey
ALTER TABLE "RentalAgreement" DROP CONSTRAINT "RentalAgreement_customer_fkey";

-- DropForeignKey
ALTER TABLE "RentalAgreement" DROP CONSTRAINT "RentalAgreement_reservation_fkey";

-- DropForeignKey
ALTER TABLE "RentalAsset" DROP CONSTRAINT "RentalAsset_item_fkey";

-- DropForeignKey
ALTER TABLE "RentalAsset" DROP CONSTRAINT "RentalAsset_location_fkey";

-- DropForeignKey
ALTER TABLE "RentalContract" DROP CONSTRAINT "RentalContract_agreement_fkey";

-- DropForeignKey
ALTER TABLE "RentalContract" DROP CONSTRAINT "RentalContract_customer_fkey";

-- DropForeignKey
ALTER TABLE "RentalContract" DROP CONSTRAINT "RentalContract_reservation_fkey";

-- DropForeignKey
ALTER TABLE "RentalCustomer" DROP CONSTRAINT "RentalCustomer_user_fkey";

-- DropForeignKey
ALTER TABLE "RentalFee" DROP CONSTRAINT "RentalFee_createdBy_fkey";

-- DropForeignKey
ALTER TABLE "RentalFee" DROP CONSTRAINT "RentalFee_customer_fkey";

-- DropForeignKey
ALTER TABLE "RentalFee" DROP CONSTRAINT "RentalFee_item_fkey";

-- DropForeignKey
ALTER TABLE "RentalFee" DROP CONSTRAINT "RentalFee_reservation_fkey";

-- DropForeignKey
ALTER TABLE "RentalItem" DROP CONSTRAINT "RentalItem_category_fkey";

-- DropForeignKey
ALTER TABLE "RentalItem" DROP CONSTRAINT "RentalItem_homeLocation_fkey";

-- DropForeignKey
ALTER TABLE "RentalReservation" DROP CONSTRAINT "RentalReservation_customer_fkey";

-- DropForeignKey
ALTER TABLE "RentalReservation" DROP CONSTRAINT "RentalReservation_item_fkey";

-- DropForeignKey
ALTER TABLE "RentalReservation" DROP CONSTRAINT "RentalReservation_pickupLocation_fkey";

-- DropForeignKey
ALTER TABLE "RentalReservation" DROP CONSTRAINT "RentalReservation_returnLocation_fkey";

-- DropForeignKey
ALTER TABLE "_RentalItem_images" DROP CONSTRAINT "_RentalItem_images_A_fkey";

-- DropForeignKey
ALTER TABLE "_RentalItem_images" DROP CONSTRAINT "_RentalItem_images_B_fkey";

-- DropIndex
DROP INDEX "Payment_customer_idx";

-- DropIndex
DROP INDEX "PaymentProvider_code_key";

-- AlterTable
-- Preserve legacy payment amounts while detaching equipment reservations that
-- have no meaningful accommodation equivalent. The retained rows remain
-- host-unscoped and therefore unavailable through the accommodation API.
ALTER TABLE "Payment"
ADD COLUMN     "amountCents" INTEGER,
ADD COLUMN     "guest" TEXT,
ADD COLUMN     "hostOrganization" TEXT,
ADD COLUMN     "idempotencyKey" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "refundedAmountCents" INTEGER DEFAULT 0,
ALTER COLUMN "paymentMethod" SET DEFAULT 'manual',
ALTER COLUMN "provider" SET DEFAULT 'manual';

UPDATE "Payment"
SET "amountCents" = COALESCE("amount", 0),
    "reservation" = NULL,
    "idempotencyKey" = 'legacy-rental-' || "id";

ALTER TABLE "Payment"
ALTER COLUMN "amountCents" SET NOT NULL,
DROP COLUMN "amount",
DROP COLUMN "customer";

-- AlterTable
ALTER TABLE "PaymentProvider" DROP COLUMN "capturePaymentFunction",
DROP COLUMN "createPaymentFunction",
DROP COLUMN "credentials",
DROP COLUMN "generatePaymentLinkFunction",
DROP COLUMN "getPaymentStatusFunction",
DROP COLUMN "handleWebhookFunction",
DROP COLUMN "refundPaymentFunction",
ADD COLUMN     "hostOrganization" TEXT,
ALTER COLUMN "isInstalled" SET DEFAULT false;

-- AlterTable
ALTER TABLE "Role" DROP COLUMN "canManageAgreements",
DROP COLUMN "canManageCustomers",
DROP COLUMN "canManageInventory",
DROP COLUMN "canReadAgreements",
DROP COLUMN "canReadCustomers",
DROP COLUMN "canReadInventory",
ADD COLUMN     "canManageCalendar" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "canManageChannels" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "canManageGuests" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "canManageListings" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "canManageMessages" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "canManagePayouts" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "canManagePricing" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "canManageProperties" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "canManageReviews" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "canReadCalendar" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "canReadChannels" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "canReadGuests" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "canReadListings" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "canReadMessages" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "canReadPayouts" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "canReadPricing" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "canReadProperties" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "canReadReviews" BOOLEAN NOT NULL DEFAULT false,
ALTER COLUMN "canManageOnboarding" SET DEFAULT false;

-- DropTable
DROP TABLE "AvailabilityBlock";

-- DropTable
DROP TABLE "AvailabilityCalendar";

-- DropTable
DROP TABLE "DamageReport";

-- DropTable
DROP TABLE "DeliveryTask";

-- DropTable
DROP TABLE "Deposit";

-- DropTable
DROP TABLE "Inspection";

-- DropTable
DROP TABLE "InsurancePolicy";

-- DropTable
DROP TABLE "LateFee";

-- DropTable
DROP TABLE "MaintenanceTicket";

-- DropTable
DROP TABLE "PickupReturn";

-- DropTable
DROP TABLE "PricingRule";

-- DropTable
DROP TABLE "RentalAgreement";

-- DropTable
DROP TABLE "RentalAsset";

-- DropTable
DROP TABLE "RentalBusinessSettings";

-- DropTable
DROP TABLE "RentalCategory";

-- DropTable
DROP TABLE "RentalContract";

-- DropTable
DROP TABLE "RentalCustomer";

-- DropTable
DROP TABLE "RentalFee";

-- DropTable
DROP TABLE "RentalItem";

-- DropTable
DROP TABLE "RentalItemImage";

-- DropTable
DROP TABLE "RentalLocation";

-- DropTable
DROP TABLE "RentalReservation";

-- DropTable
DROP TABLE "_RentalItem_images";

-- CreateTable
CREATE TABLE "MarketplaceSettings" (
    "id" INTEGER NOT NULL,
    "name" TEXT NOT NULL DEFAULT '',
    "tagline" TEXT NOT NULL DEFAULT '',
    "publicDescription" TEXT NOT NULL DEFAULT '',
    "supportEmail" TEXT NOT NULL DEFAULT '',
    "supportPhone" TEXT NOT NULL DEFAULT '',
    "currencyCode" TEXT NOT NULL DEFAULT 'USD',
    "locale" TEXT NOT NULL DEFAULT 'en-US',
    "timezone" TEXT NOT NULL DEFAULT 'America/New_York',
    "defaultMapLatitude" DOUBLE PRECISION,
    "defaultMapLongitude" DOUBLE PRECISION,
    "isPublished" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MarketplaceSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HostOrganization" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL DEFAULT '',
    "slug" TEXT NOT NULL DEFAULT '',
    "organizationType" TEXT DEFAULT 'individual_host',
    "status" TEXT DEFAULT 'onboarding',
    "publicBio" TEXT NOT NULL DEFAULT '',
    "publicEmail" TEXT NOT NULL DEFAULT '',
    "publicPhone" TEXT NOT NULL DEFAULT '',
    "website" TEXT NOT NULL DEFAULT '',
    "canonicalUrl" TEXT NOT NULL DEFAULT '',
    "federationId" TEXT NOT NULL DEFAULT '',
    "dataCustody" TEXT DEFAULT 'self_hosted',
    "isPublic" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HostOrganization_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HostMembership" (
    "id" TEXT NOT NULL,
    "hostOrganization" TEXT,
    "user" TEXT,
    "membershipRole" TEXT DEFAULT 'manager',
    "status" TEXT DEFAULT 'invited',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HostMembership_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Property" (
    "id" TEXT NOT NULL,
    "hostOrganization" TEXT,
    "name" TEXT NOT NULL DEFAULT '',
    "internalCode" TEXT NOT NULL DEFAULT '',
    "propertyType" TEXT DEFAULT 'house',
    "status" TEXT DEFAULT 'onboarding',
    "timezone" TEXT NOT NULL DEFAULT 'America/New_York',
    "checkInFrom" TEXT NOT NULL DEFAULT '16:00',
    "checkInUntil" TEXT NOT NULL DEFAULT '22:00',
    "checkOutBy" TEXT NOT NULL DEFAULT '11:00',
    "registrationNumber" TEXT NOT NULL DEFAULT '',
    "internalNotes" TEXT NOT NULL DEFAULT '',
    "address" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Property_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PropertyAddress" (
    "id" TEXT NOT NULL,
    "hostOrganization" TEXT,
    "addressLine1" TEXT NOT NULL DEFAULT '',
    "addressLine2" TEXT NOT NULL DEFAULT '',
    "city" TEXT NOT NULL DEFAULT '',
    "region" TEXT NOT NULL DEFAULT '',
    "postalCode" TEXT NOT NULL DEFAULT '',
    "countryCode" TEXT NOT NULL DEFAULT 'US',
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "publicLocationLabel" TEXT NOT NULL DEFAULT '',
    "showExactAddressPublicly" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PropertyAddress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AccommodationUnit" (
    "id" TEXT NOT NULL,
    "hostOrganization" TEXT,
    "property" TEXT,
    "name" TEXT NOT NULL DEFAULT '',
    "accommodationType" TEXT DEFAULT 'entire_home',
    "status" TEXT DEFAULT 'available',
    "maxGuests" INTEGER DEFAULT 2,
    "bedroomCount" INTEGER DEFAULT 1,
    "bedCount" INTEGER DEFAULT 1,
    "bathroomCountHalfUnits" INTEGER DEFAULT 2,
    "squareFeet" INTEGER,
    "floorLabel" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AccommodationUnit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Bedroom" (
    "id" TEXT NOT NULL,
    "hostOrganization" TEXT,
    "accommodationUnit" TEXT,
    "name" TEXT NOT NULL DEFAULT '',
    "order" INTEGER DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Bedroom_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Bed" (
    "id" TEXT NOT NULL,
    "hostOrganization" TEXT,
    "bedroom" TEXT,
    "bedType" TEXT DEFAULT 'queen',
    "quantity" INTEGER DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Bed_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Amenity" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL DEFAULT '',
    "slug" TEXT NOT NULL DEFAULT '',
    "category" TEXT DEFAULT 'essentials',
    "iconKey" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Amenity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Listing" (
    "id" TEXT NOT NULL,
    "hostOrganization" TEXT,
    "property" TEXT,
    "accommodationUnit" TEXT,
    "title" TEXT NOT NULL DEFAULT '',
    "slug" TEXT NOT NULL DEFAULT '',
    "subtitle" TEXT NOT NULL DEFAULT '',
    "description" TEXT NOT NULL DEFAULT '',
    "status" TEXT DEFAULT 'draft',
    "bookingMode" TEXT DEFAULT 'request',
    "instantBook" BOOLEAN NOT NULL DEFAULT false,
    "isFeatured" BOOLEAN NOT NULL DEFAULT false,
    "currencyCode" TEXT NOT NULL DEFAULT 'USD',
    "baseNightlyRateCents" INTEGER DEFAULT 0,
    "securityDepositCents" INTEGER DEFAULT 0,
    "minimumStay" INTEGER DEFAULT 1,
    "maximumStay" INTEGER,
    "advanceNoticeHours" INTEGER DEFAULT 24,
    "bookingWindowDays" INTEGER DEFAULT 365,
    "reviewAverageHundredths" INTEGER DEFAULT 0,
    "reviewCount" INTEGER DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Listing_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ListingMedia" (
    "id" TEXT NOT NULL,
    "hostOrganization" TEXT,
    "listing" TEXT,
    "image_id" TEXT,
    "image_filesize" INTEGER,
    "image_width" INTEGER,
    "image_height" INTEGER,
    "image_extension" TEXT,
    "imagePath" TEXT NOT NULL DEFAULT '',
    "altText" TEXT NOT NULL DEFAULT '',
    "caption" TEXT NOT NULL DEFAULT '',
    "order" INTEGER DEFAULT 0,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ListingMedia_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StayCollection" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL DEFAULT '',
    "slug" TEXT NOT NULL DEFAULT '',
    "description" TEXT NOT NULL DEFAULT '',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StayCollection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HouseRule" (
    "id" TEXT NOT NULL,
    "hostOrganization" TEXT,
    "listing" TEXT,
    "ruleType" TEXT DEFAULT 'custom',
    "title" TEXT NOT NULL DEFAULT '',
    "description" TEXT NOT NULL DEFAULT '',
    "isAllowed" BOOLEAN NOT NULL DEFAULT false,
    "isRequired" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HouseRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CalendarBlock" (
    "id" TEXT NOT NULL,
    "hostOrganization" TEXT,
    "listing" TEXT,
    "reservation" TEXT,
    "channelReservation" TEXT,
    "startDate" TEXT NOT NULL DEFAULT '',
    "endDate" TEXT NOT NULL DEFAULT '',
    "reason" TEXT DEFAULT 'owner_block',
    "status" TEXT DEFAULT 'active',
    "source" TEXT DEFAULT 'operator',
    "externalUid" TEXT NOT NULL DEFAULT '',
    "notes" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CalendarBlock_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RatePlan" (
    "id" TEXT NOT NULL,
    "hostOrganization" TEXT,
    "listing" TEXT,
    "cancellationPolicy" TEXT,
    "name" TEXT NOT NULL DEFAULT '',
    "description" TEXT NOT NULL DEFAULT '',
    "status" TEXT DEFAULT 'draft',
    "currencyCode" TEXT NOT NULL DEFAULT 'USD',
    "baseNightlyRateCents" INTEGER DEFAULT 0,
    "minimumStay" INTEGER DEFAULT 1,
    "maximumStay" INTEGER,
    "advanceNoticeHours" INTEGER DEFAULT 24,
    "bookingWindowDays" INTEGER DEFAULT 365,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RatePlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SeasonalRate" (
    "id" TEXT NOT NULL,
    "hostOrganization" TEXT,
    "ratePlan" TEXT,
    "name" TEXT NOT NULL DEFAULT '',
    "startDate" TEXT NOT NULL DEFAULT '',
    "endDate" TEXT NOT NULL DEFAULT '',
    "nightlyRateCents" INTEGER,
    "adjustmentBasisPoints" INTEGER,
    "minimumStay" INTEGER,
    "priority" INTEGER DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SeasonalRate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FeeDefinition" (
    "id" TEXT NOT NULL,
    "hostOrganization" TEXT,
    "listing" TEXT,
    "name" TEXT NOT NULL DEFAULT '',
    "feeType" TEXT DEFAULT 'cleaning',
    "calculation" TEXT DEFAULT 'fixed',
    "amountCents" INTEGER DEFAULT 0,
    "percentageBasisPoints" INTEGER DEFAULT 0,
    "taxable" BOOLEAN NOT NULL DEFAULT true,
    "required" BOOLEAN NOT NULL DEFAULT true,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FeeDefinition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TaxRule" (
    "id" TEXT NOT NULL,
    "hostOrganization" TEXT,
    "listing" TEXT,
    "name" TEXT NOT NULL DEFAULT '',
    "jurisdiction" TEXT NOT NULL DEFAULT '',
    "registrationNumber" TEXT NOT NULL DEFAULT '',
    "rateBasisPoints" INTEGER NOT NULL,
    "isInclusive" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TaxRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CancellationPolicy" (
    "id" TEXT NOT NULL,
    "hostOrganization" TEXT,
    "name" TEXT NOT NULL DEFAULT '',
    "version" TEXT NOT NULL DEFAULT '',
    "policyType" TEXT DEFAULT 'moderate',
    "summary" TEXT NOT NULL DEFAULT '',
    "fullTerms" TEXT NOT NULL DEFAULT '',
    "freeCancellationHours" INTEGER DEFAULT 24,
    "rules" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CancellationPolicy_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StayQuote" (
    "id" TEXT NOT NULL,
    "hostOrganization" TEXT,
    "listing" TEXT,
    "ratePlan" TEXT,
    "quoteNumber" TEXT NOT NULL DEFAULT '',
    "tokenHash" TEXT NOT NULL DEFAULT '',
    "status" TEXT DEFAULT 'active',
    "checkInDate" TEXT NOT NULL DEFAULT '',
    "checkOutDate" TEXT NOT NULL DEFAULT '',
    "adults" INTEGER DEFAULT 1,
    "children" INTEGER DEFAULT 0,
    "infants" INTEGER DEFAULT 0,
    "pets" INTEGER DEFAULT 0,
    "currencyCode" TEXT NOT NULL DEFAULT 'USD',
    "lodgingSubtotalCents" INTEGER DEFAULT 0,
    "feeTotalCents" INTEGER DEFAULT 0,
    "taxTotalCents" INTEGER DEFAULT 0,
    "securityDepositCents" INTEGER DEFAULT 0,
    "totalAmountCents" INTEGER DEFAULT 0,
    "quoteSnapshot" JSONB,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "consumedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StayQuote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GuestProfile" (
    "id" TEXT NOT NULL,
    "hostOrganization" TEXT,
    "user" TEXT,
    "name" TEXT NOT NULL DEFAULT '',
    "email" TEXT NOT NULL DEFAULT '',
    "phone" TEXT NOT NULL DEFAULT '',
    "verificationStatus" TEXT DEFAULT 'unverified',
    "preferredLanguage" TEXT NOT NULL DEFAULT 'en',
    "marketingConsent" BOOLEAN NOT NULL DEFAULT false,
    "internalNotes" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GuestProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GuestParty" (
    "id" TEXT NOT NULL,
    "hostOrganization" TEXT,
    "reservation" TEXT,
    "primaryGuest" TEXT,
    "adults" INTEGER DEFAULT 1,
    "children" INTEGER DEFAULT 0,
    "infants" INTEGER DEFAULT 0,
    "pets" INTEGER DEFAULT 0,
    "invitedGuests" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GuestParty_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Reservation" (
    "id" TEXT NOT NULL,
    "hostOrganization" TEXT,
    "listing" TEXT,
    "accommodationUnit" TEXT,
    "guest" TEXT,
    "quote" TEXT,
    "confirmationCode" TEXT NOT NULL DEFAULT '',
    "tripTokenHash" TEXT NOT NULL DEFAULT '',
    "tripTokenExpiresAt" TIMESTAMP(3) NOT NULL,
    "tripTokenRevokedAt" TIMESTAMP(3),
    "status" TEXT DEFAULT 'pending',
    "paymentStatus" TEXT DEFAULT 'unpaid',
    "source" TEXT DEFAULT 'direct',
    "checkInDate" TEXT NOT NULL DEFAULT '',
    "checkOutDate" TEXT NOT NULL DEFAULT '',
    "scheduledCheckInTime" TEXT NOT NULL DEFAULT '',
    "scheduledCheckOutTime" TEXT NOT NULL DEFAULT '',
    "checkedInAt" TIMESTAMP(3),
    "checkedOutAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "cancellationReason" TEXT NOT NULL DEFAULT '',
    "cancelledBy" TEXT,
    "currencyCode" TEXT NOT NULL DEFAULT 'USD',
    "lodgingSubtotalCents" INTEGER DEFAULT 0,
    "feeTotalCents" INTEGER DEFAULT 0,
    "taxTotalCents" INTEGER DEFAULT 0,
    "discountTotalCents" INTEGER DEFAULT 0,
    "securityDepositCents" INTEGER DEFAULT 0,
    "totalAmountCents" INTEGER DEFAULT 0,
    "amountPaidCents" INTEGER DEFAULT 0,
    "bookingSnapshot" JSONB,
    "guestNotes" TEXT NOT NULL DEFAULT '',
    "internalNotes" TEXT NOT NULL DEFAULT '',
    "agreement" TEXT,
    "securityDeposit" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Reservation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReservationLineItem" (
    "id" TEXT NOT NULL,
    "hostOrganization" TEXT,
    "reservation" TEXT,
    "snapshotKey" TEXT NOT NULL DEFAULT '',
    "lineType" TEXT DEFAULT 'night',
    "description" TEXT NOT NULL DEFAULT '',
    "serviceDate" TEXT NOT NULL DEFAULT '',
    "quantity" INTEGER DEFAULT 1,
    "unitAmountCents" INTEGER NOT NULL,
    "totalAmountCents" INTEGER NOT NULL,
    "currencyCode" TEXT NOT NULL DEFAULT 'USD',
    "metadataSnapshot" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReservationLineItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StayAgreement" (
    "id" TEXT NOT NULL,
    "hostOrganization" TEXT,
    "guest" TEXT,
    "cancellationPolicy" TEXT,
    "agreementNumber" TEXT NOT NULL DEFAULT '',
    "signingTokenHash" TEXT NOT NULL DEFAULT '',
    "signingTokenExpiresAt" TIMESTAMP(3),
    "signingTokenRevokedAt" TIMESTAMP(3),
    "status" TEXT DEFAULT 'draft',
    "title" TEXT NOT NULL DEFAULT '',
    "signerEmail" TEXT NOT NULL DEFAULT '',
    "signatureName" TEXT NOT NULL DEFAULT '',
    "signedAt" TIMESTAMP(3),
    "termsSnapshot" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StayAgreement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SecurityDeposit" (
    "id" TEXT NOT NULL,
    "hostOrganization" TEXT,
    "payment" TEXT,
    "depositNumber" TEXT NOT NULL DEFAULT '',
    "status" TEXT DEFAULT 'required',
    "amountCents" INTEGER DEFAULT 0,
    "capturedAmountCents" INTEGER DEFAULT 0,
    "currencyCode" TEXT NOT NULL DEFAULT 'USD',
    "heldAt" TIMESTAMP(3),
    "releasedAt" TIMESTAMP(3),
    "providerReference" TEXT NOT NULL DEFAULT '',
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SecurityDeposit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DamageClaim" (
    "id" TEXT NOT NULL,
    "hostOrganization" TEXT,
    "reservation" TEXT,
    "listing" TEXT,
    "guest" TEXT,
    "claimNumber" TEXT NOT NULL DEFAULT '',
    "status" TEXT DEFAULT 'draft',
    "description" TEXT NOT NULL DEFAULT '',
    "claimedAmountCents" INTEGER DEFAULT 0,
    "approvedAmountCents" INTEGER DEFAULT 0,
    "currencyCode" TEXT NOT NULL DEFAULT 'USD',
    "evidence" JSONB,
    "submittedAt" TIMESTAMP(3),
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DamageClaim_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentWebhookEvent" (
    "id" TEXT NOT NULL,
    "hostOrganization" TEXT,
    "paymentProvider" TEXT,
    "payment" TEXT,
    "replayKey" TEXT NOT NULL DEFAULT '',
    "providerCode" TEXT NOT NULL DEFAULT '',
    "providerEventId" TEXT NOT NULL DEFAULT '',
    "eventType" TEXT NOT NULL DEFAULT '',
    "payloadSha256" TEXT NOT NULL DEFAULT '',
    "status" TEXT DEFAULT 'processed',
    "processedAt" TIMESTAMP(3) NOT NULL,
    "errorMessage" TEXT NOT NULL DEFAULT '',
    "evidence" JSONB DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PaymentWebhookEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Refund" (
    "id" TEXT NOT NULL,
    "hostOrganization" TEXT,
    "reservation" TEXT,
    "payment" TEXT,
    "refundNumber" TEXT NOT NULL DEFAULT '',
    "status" TEXT DEFAULT 'pending',
    "reason" TEXT DEFAULT 'other',
    "amountCents" INTEGER NOT NULL,
    "currencyCode" TEXT NOT NULL DEFAULT 'USD',
    "providerRefundId" TEXT NOT NULL DEFAULT '',
    "processedAt" TIMESTAMP(3),
    "data" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Refund_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Payout" (
    "id" TEXT NOT NULL,
    "hostOrganization" TEXT,
    "reservation" TEXT,
    "payoutNumber" TEXT NOT NULL DEFAULT '',
    "status" TEXT DEFAULT 'scheduled',
    "currencyCode" TEXT NOT NULL DEFAULT 'USD',
    "grossAmountCents" INTEGER DEFAULT 0,
    "platformFeeCents" INTEGER DEFAULT 0,
    "managerFeeCents" INTEGER DEFAULT 0,
    "refundAmountCents" INTEGER DEFAULT 0,
    "netAmountCents" INTEGER DEFAULT 0,
    "providerPayoutId" TEXT NOT NULL DEFAULT '',
    "scheduledAt" TIMESTAMP(3),
    "paidAt" TIMESTAMP(3),
    "data" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Payout_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Conversation" (
    "id" TEXT NOT NULL,
    "hostOrganization" TEXT,
    "reservation" TEXT,
    "listing" TEXT,
    "guest" TEXT,
    "channelConnection" TEXT,
    "subject" TEXT NOT NULL DEFAULT '',
    "status" TEXT DEFAULT 'open',
    "externalThreadId" TEXT NOT NULL DEFAULT '',
    "lastMessageAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Conversation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Message" (
    "id" TEXT NOT NULL,
    "hostOrganization" TEXT,
    "conversation" TEXT,
    "senderUser" TEXT,
    "direction" TEXT DEFAULT 'outbound',
    "senderType" TEXT DEFAULT 'host',
    "body" TEXT NOT NULL DEFAULT '',
    "status" TEXT DEFAULT 'draft',
    "externalMessageId" TEXT NOT NULL DEFAULT '',
    "attachments" JSONB,
    "sentAt" TIMESTAMP(3),
    "receivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Message_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Review" (
    "id" TEXT NOT NULL,
    "hostOrganization" TEXT,
    "reservation" TEXT,
    "listing" TEXT,
    "guest" TEXT,
    "authorUser" TEXT,
    "direction" TEXT DEFAULT 'guest_to_host',
    "status" TEXT DEFAULT 'draft',
    "overallRating" INTEGER,
    "cleanlinessRating" INTEGER,
    "accuracyRating" INTEGER,
    "communicationRating" INTEGER,
    "locationRating" INTEGER,
    "valueRating" INTEGER,
    "body" TEXT NOT NULL DEFAULT '',
    "privateFeedback" TEXT NOT NULL DEFAULT '',
    "submittedAt" TIMESTAMP(3),
    "publishAfter" TIMESTAMP(3),
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Review_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PropertyTask" (
    "id" TEXT NOT NULL,
    "hostOrganization" TEXT,
    "property" TEXT,
    "listing" TEXT,
    "reservation" TEXT,
    "assignee" TEXT,
    "title" TEXT NOT NULL DEFAULT '',
    "taskType" TEXT DEFAULT 'turnover_cleaning',
    "status" TEXT DEFAULT 'queued',
    "priority" TEXT DEFAULT 'normal',
    "dueAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "checklist" JSONB,
    "notes" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PropertyTask_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChannelConnection" (
    "id" TEXT NOT NULL,
    "hostOrganization" TEXT,
    "name" TEXT NOT NULL DEFAULT '',
    "provider" TEXT DEFAULT 'ical',
    "connectionType" TEXT DEFAULT 'ical',
    "status" TEXT DEFAULT 'pending',
    "credentials" JSONB DEFAULT '{}',
    "settings" JSONB DEFAULT '{}',
    "syncAvailability" BOOLEAN NOT NULL DEFAULT true,
    "syncRates" BOOLEAN NOT NULL DEFAULT false,
    "syncReservations" BOOLEAN NOT NULL DEFAULT true,
    "syncMessages" BOOLEAN NOT NULL DEFAULT false,
    "lastSyncedAt" TIMESTAMP(3),
    "lastError" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChannelConnection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChannelListing" (
    "id" TEXT NOT NULL,
    "hostOrganization" TEXT,
    "listing" TEXT,
    "channelConnection" TEXT,
    "externalListingId" TEXT NOT NULL DEFAULT '',
    "externalUrl" TEXT NOT NULL DEFAULT '',
    "status" TEXT DEFAULT 'pending',
    "mapping" JSONB DEFAULT '{}',
    "lastSyncedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChannelListing_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChannelReservation" (
    "id" TEXT NOT NULL,
    "hostOrganization" TEXT,
    "channelConnection" TEXT,
    "channelListing" TEXT,
    "reservation" TEXT,
    "externalReservationId" TEXT NOT NULL DEFAULT '',
    "status" TEXT DEFAULT 'imported',
    "guestName" TEXT NOT NULL DEFAULT '',
    "guestEmail" TEXT NOT NULL DEFAULT '',
    "checkInDate" TEXT NOT NULL DEFAULT '',
    "checkOutDate" TEXT NOT NULL DEFAULT '',
    "totalAmountCents" INTEGER,
    "commissionAmountCents" INTEGER,
    "currencyCode" TEXT NOT NULL DEFAULT 'USD',
    "rawData" JSONB DEFAULT '{}',
    "lastSyncedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChannelReservation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChannelSyncEvent" (
    "id" TEXT NOT NULL,
    "hostOrganization" TEXT,
    "channelConnection" TEXT,
    "channelListing" TEXT,
    "channelReservation" TEXT,
    "action" TEXT DEFAULT 'availability_import',
    "status" TEXT DEFAULT 'processing',
    "message" TEXT NOT NULL DEFAULT '',
    "payload" JSONB,
    "errorMessage" TEXT NOT NULL DEFAULT '',
    "attempts" INTEGER DEFAULT 0,
    "nextAttemptAt" TIMESTAMP(3),
    "occurredAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChannelSyncEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_Amenity_listings" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_Amenity_listings_AB_pkey" PRIMARY KEY ("A", "B")
);

-- CreateTable
CREATE TABLE "_Listing_collections" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_Listing_collections_AB_pkey" PRIMARY KEY ("A", "B")
);

-- CreateIndex
CREATE UNIQUE INDEX "HostOrganization_slug_key" ON "HostOrganization"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "HostOrganization_federationId_key" ON "HostOrganization"("federationId");

-- CreateIndex
CREATE INDEX "HostMembership_hostOrganization_idx" ON "HostMembership"("hostOrganization");

-- CreateIndex
CREATE INDEX "HostMembership_user_idx" ON "HostMembership"("user");

-- CreateIndex
CREATE UNIQUE INDEX "HostMembership_hostOrganization_user_key" ON "HostMembership"("hostOrganization", "user");

-- CreateIndex
CREATE UNIQUE INDEX "Property_internalCode_key" ON "Property"("internalCode");

-- CreateIndex
CREATE UNIQUE INDEX "Property_address_key" ON "Property"("address");

-- CreateIndex
CREATE INDEX "Property_hostOrganization_idx" ON "Property"("hostOrganization");

-- CreateIndex
CREATE INDEX "PropertyAddress_hostOrganization_idx" ON "PropertyAddress"("hostOrganization");

-- CreateIndex
CREATE INDEX "AccommodationUnit_hostOrganization_idx" ON "AccommodationUnit"("hostOrganization");

-- CreateIndex
CREATE INDEX "AccommodationUnit_property_idx" ON "AccommodationUnit"("property");

-- CreateIndex
CREATE INDEX "Bedroom_hostOrganization_idx" ON "Bedroom"("hostOrganization");

-- CreateIndex
CREATE INDEX "Bedroom_accommodationUnit_idx" ON "Bedroom"("accommodationUnit");

-- CreateIndex
CREATE INDEX "Bed_hostOrganization_idx" ON "Bed"("hostOrganization");

-- CreateIndex
CREATE INDEX "Bed_bedroom_idx" ON "Bed"("bedroom");

-- CreateIndex
CREATE UNIQUE INDEX "Amenity_name_key" ON "Amenity"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Amenity_slug_key" ON "Amenity"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Listing_slug_key" ON "Listing"("slug");

-- CreateIndex
CREATE INDEX "Listing_hostOrganization_idx" ON "Listing"("hostOrganization");

-- CreateIndex
CREATE INDEX "Listing_property_idx" ON "Listing"("property");

-- CreateIndex
CREATE INDEX "Listing_accommodationUnit_idx" ON "Listing"("accommodationUnit");

-- CreateIndex
CREATE UNIQUE INDEX "ListingMedia_imagePath_key" ON "ListingMedia"("imagePath");

-- CreateIndex
CREATE INDEX "ListingMedia_hostOrganization_idx" ON "ListingMedia"("hostOrganization");

-- CreateIndex
CREATE INDEX "ListingMedia_listing_idx" ON "ListingMedia"("listing");

-- CreateIndex
CREATE UNIQUE INDEX "StayCollection_slug_key" ON "StayCollection"("slug");

-- CreateIndex
CREATE INDEX "HouseRule_hostOrganization_idx" ON "HouseRule"("hostOrganization");

-- CreateIndex
CREATE INDEX "HouseRule_listing_idx" ON "HouseRule"("listing");

-- CreateIndex
CREATE INDEX "CalendarBlock_hostOrganization_idx" ON "CalendarBlock"("hostOrganization");

-- CreateIndex
CREATE INDEX "CalendarBlock_listing_idx" ON "CalendarBlock"("listing");

-- CreateIndex
CREATE INDEX "CalendarBlock_reservation_idx" ON "CalendarBlock"("reservation");

-- CreateIndex
CREATE INDEX "CalendarBlock_channelReservation_idx" ON "CalendarBlock"("channelReservation");

-- CreateIndex
CREATE INDEX "CalendarBlock_externalUid_idx" ON "CalendarBlock"("externalUid");

-- CreateIndex
CREATE INDEX "RatePlan_hostOrganization_idx" ON "RatePlan"("hostOrganization");

-- CreateIndex
CREATE INDEX "RatePlan_listing_idx" ON "RatePlan"("listing");

-- CreateIndex
CREATE INDEX "RatePlan_cancellationPolicy_idx" ON "RatePlan"("cancellationPolicy");

-- CreateIndex
CREATE INDEX "SeasonalRate_hostOrganization_idx" ON "SeasonalRate"("hostOrganization");

-- CreateIndex
CREATE INDEX "SeasonalRate_ratePlan_idx" ON "SeasonalRate"("ratePlan");

-- CreateIndex
CREATE INDEX "FeeDefinition_hostOrganization_idx" ON "FeeDefinition"("hostOrganization");

-- CreateIndex
CREATE INDEX "FeeDefinition_listing_idx" ON "FeeDefinition"("listing");

-- CreateIndex
CREATE INDEX "TaxRule_hostOrganization_idx" ON "TaxRule"("hostOrganization");

-- CreateIndex
CREATE INDEX "TaxRule_listing_idx" ON "TaxRule"("listing");

-- CreateIndex
CREATE INDEX "CancellationPolicy_hostOrganization_idx" ON "CancellationPolicy"("hostOrganization");

-- CreateIndex
CREATE UNIQUE INDEX "StayQuote_quoteNumber_key" ON "StayQuote"("quoteNumber");

-- CreateIndex
CREATE UNIQUE INDEX "StayQuote_tokenHash_key" ON "StayQuote"("tokenHash");

-- CreateIndex
CREATE INDEX "StayQuote_hostOrganization_idx" ON "StayQuote"("hostOrganization");

-- CreateIndex
CREATE INDEX "StayQuote_listing_idx" ON "StayQuote"("listing");

-- CreateIndex
CREATE INDEX "StayQuote_ratePlan_idx" ON "StayQuote"("ratePlan");

-- CreateIndex
CREATE UNIQUE INDEX "GuestProfile_user_key" ON "GuestProfile"("user");

-- CreateIndex
CREATE INDEX "GuestProfile_hostOrganization_idx" ON "GuestProfile"("hostOrganization");

-- CreateIndex
CREATE UNIQUE INDEX "GuestParty_reservation_key" ON "GuestParty"("reservation");

-- CreateIndex
CREATE INDEX "GuestParty_hostOrganization_idx" ON "GuestParty"("hostOrganization");

-- CreateIndex
CREATE INDEX "GuestParty_primaryGuest_idx" ON "GuestParty"("primaryGuest");

-- CreateIndex
CREATE UNIQUE INDEX "Reservation_quote_key" ON "Reservation"("quote");

-- CreateIndex
CREATE UNIQUE INDEX "Reservation_confirmationCode_key" ON "Reservation"("confirmationCode");

-- CreateIndex
CREATE UNIQUE INDEX "Reservation_tripTokenHash_key" ON "Reservation"("tripTokenHash");

-- CreateIndex
CREATE UNIQUE INDEX "Reservation_agreement_key" ON "Reservation"("agreement");

-- CreateIndex
CREATE UNIQUE INDEX "Reservation_securityDeposit_key" ON "Reservation"("securityDeposit");

-- CreateIndex
CREATE INDEX "Reservation_hostOrganization_idx" ON "Reservation"("hostOrganization");

-- CreateIndex
CREATE INDEX "Reservation_listing_idx" ON "Reservation"("listing");

-- CreateIndex
CREATE INDEX "Reservation_accommodationUnit_idx" ON "Reservation"("accommodationUnit");

-- CreateIndex
CREATE INDEX "Reservation_guest_idx" ON "Reservation"("guest");

-- CreateIndex
CREATE UNIQUE INDEX "ReservationLineItem_snapshotKey_key" ON "ReservationLineItem"("snapshotKey");

-- CreateIndex
CREATE INDEX "ReservationLineItem_hostOrganization_idx" ON "ReservationLineItem"("hostOrganization");

-- CreateIndex
CREATE INDEX "ReservationLineItem_reservation_idx" ON "ReservationLineItem"("reservation");

-- CreateIndex
CREATE UNIQUE INDEX "StayAgreement_agreementNumber_key" ON "StayAgreement"("agreementNumber");

-- CreateIndex
CREATE UNIQUE INDEX "StayAgreement_signingTokenHash_key" ON "StayAgreement"("signingTokenHash");

-- CreateIndex
CREATE INDEX "StayAgreement_hostOrganization_idx" ON "StayAgreement"("hostOrganization");

-- CreateIndex
CREATE INDEX "StayAgreement_guest_idx" ON "StayAgreement"("guest");

-- CreateIndex
CREATE INDEX "StayAgreement_cancellationPolicy_idx" ON "StayAgreement"("cancellationPolicy");

-- CreateIndex
CREATE UNIQUE INDEX "SecurityDeposit_depositNumber_key" ON "SecurityDeposit"("depositNumber");

-- CreateIndex
CREATE INDEX "SecurityDeposit_hostOrganization_idx" ON "SecurityDeposit"("hostOrganization");

-- CreateIndex
CREATE INDEX "SecurityDeposit_payment_idx" ON "SecurityDeposit"("payment");

-- CreateIndex
CREATE UNIQUE INDEX "DamageClaim_claimNumber_key" ON "DamageClaim"("claimNumber");

-- CreateIndex
CREATE INDEX "DamageClaim_hostOrganization_idx" ON "DamageClaim"("hostOrganization");

-- CreateIndex
CREATE INDEX "DamageClaim_reservation_idx" ON "DamageClaim"("reservation");

-- CreateIndex
CREATE INDEX "DamageClaim_listing_idx" ON "DamageClaim"("listing");

-- CreateIndex
CREATE INDEX "DamageClaim_guest_idx" ON "DamageClaim"("guest");

-- CreateIndex
CREATE UNIQUE INDEX "PaymentWebhookEvent_replayKey_key" ON "PaymentWebhookEvent"("replayKey");

-- CreateIndex
CREATE INDEX "PaymentWebhookEvent_hostOrganization_idx" ON "PaymentWebhookEvent"("hostOrganization");

-- CreateIndex
CREATE INDEX "PaymentWebhookEvent_paymentProvider_idx" ON "PaymentWebhookEvent"("paymentProvider");

-- CreateIndex
CREATE INDEX "PaymentWebhookEvent_payment_idx" ON "PaymentWebhookEvent"("payment");

-- CreateIndex
CREATE UNIQUE INDEX "Refund_refundNumber_key" ON "Refund"("refundNumber");

-- CreateIndex
CREATE UNIQUE INDEX "Refund_providerRefundId_key" ON "Refund"("providerRefundId");

-- CreateIndex
CREATE INDEX "Refund_hostOrganization_idx" ON "Refund"("hostOrganization");

-- CreateIndex
CREATE INDEX "Refund_reservation_idx" ON "Refund"("reservation");

-- CreateIndex
CREATE INDEX "Refund_payment_idx" ON "Refund"("payment");

-- CreateIndex
CREATE UNIQUE INDEX "Payout_reservation_key" ON "Payout"("reservation");

-- CreateIndex
CREATE UNIQUE INDEX "Payout_payoutNumber_key" ON "Payout"("payoutNumber");

-- CreateIndex
CREATE UNIQUE INDEX "Payout_providerPayoutId_key" ON "Payout"("providerPayoutId");

-- CreateIndex
CREATE INDEX "Payout_hostOrganization_idx" ON "Payout"("hostOrganization");

-- CreateIndex
CREATE UNIQUE INDEX "Conversation_reservation_key" ON "Conversation"("reservation");

-- CreateIndex
CREATE INDEX "Conversation_hostOrganization_idx" ON "Conversation"("hostOrganization");

-- CreateIndex
CREATE INDEX "Conversation_listing_idx" ON "Conversation"("listing");

-- CreateIndex
CREATE INDEX "Conversation_guest_idx" ON "Conversation"("guest");

-- CreateIndex
CREATE INDEX "Conversation_channelConnection_idx" ON "Conversation"("channelConnection");

-- CreateIndex
CREATE INDEX "Conversation_externalThreadId_idx" ON "Conversation"("externalThreadId");

-- CreateIndex
CREATE INDEX "Message_hostOrganization_idx" ON "Message"("hostOrganization");

-- CreateIndex
CREATE INDEX "Message_conversation_idx" ON "Message"("conversation");

-- CreateIndex
CREATE INDEX "Message_senderUser_idx" ON "Message"("senderUser");

-- CreateIndex
CREATE INDEX "Message_externalMessageId_idx" ON "Message"("externalMessageId");

-- CreateIndex
CREATE INDEX "Review_hostOrganization_idx" ON "Review"("hostOrganization");

-- CreateIndex
CREATE INDEX "Review_reservation_idx" ON "Review"("reservation");

-- CreateIndex
CREATE INDEX "Review_listing_idx" ON "Review"("listing");

-- CreateIndex
CREATE INDEX "Review_guest_idx" ON "Review"("guest");

-- CreateIndex
CREATE INDEX "Review_authorUser_idx" ON "Review"("authorUser");

-- CreateIndex
CREATE INDEX "PropertyTask_hostOrganization_idx" ON "PropertyTask"("hostOrganization");

-- CreateIndex
CREATE INDEX "PropertyTask_property_idx" ON "PropertyTask"("property");

-- CreateIndex
CREATE INDEX "PropertyTask_listing_idx" ON "PropertyTask"("listing");

-- CreateIndex
CREATE INDEX "PropertyTask_reservation_idx" ON "PropertyTask"("reservation");

-- CreateIndex
CREATE INDEX "PropertyTask_assignee_idx" ON "PropertyTask"("assignee");

-- CreateIndex
CREATE INDEX "ChannelConnection_hostOrganization_idx" ON "ChannelConnection"("hostOrganization");

-- CreateIndex
CREATE INDEX "ChannelListing_hostOrganization_idx" ON "ChannelListing"("hostOrganization");

-- CreateIndex
CREATE INDEX "ChannelListing_listing_idx" ON "ChannelListing"("listing");

-- CreateIndex
CREATE INDEX "ChannelListing_channelConnection_idx" ON "ChannelListing"("channelConnection");

-- CreateIndex
CREATE INDEX "ChannelListing_externalListingId_idx" ON "ChannelListing"("externalListingId");

-- CreateIndex
CREATE UNIQUE INDEX "ChannelReservation_reservation_key" ON "ChannelReservation"("reservation");

-- CreateIndex
CREATE INDEX "ChannelReservation_hostOrganization_idx" ON "ChannelReservation"("hostOrganization");

-- CreateIndex
CREATE INDEX "ChannelReservation_channelConnection_idx" ON "ChannelReservation"("channelConnection");

-- CreateIndex
CREATE INDEX "ChannelReservation_channelListing_idx" ON "ChannelReservation"("channelListing");

-- CreateIndex
CREATE INDEX "ChannelReservation_externalReservationId_idx" ON "ChannelReservation"("externalReservationId");

-- CreateIndex
CREATE INDEX "ChannelSyncEvent_hostOrganization_idx" ON "ChannelSyncEvent"("hostOrganization");

-- CreateIndex
CREATE INDEX "ChannelSyncEvent_channelConnection_idx" ON "ChannelSyncEvent"("channelConnection");

-- CreateIndex
CREATE INDEX "ChannelSyncEvent_channelListing_idx" ON "ChannelSyncEvent"("channelListing");

-- CreateIndex
CREATE INDEX "ChannelSyncEvent_channelReservation_idx" ON "ChannelSyncEvent"("channelReservation");

-- CreateIndex
CREATE INDEX "_Amenity_listings_B_index" ON "_Amenity_listings"("B");

-- CreateIndex
CREATE INDEX "_Listing_collections_B_index" ON "_Listing_collections"("B");

-- CreateIndex
CREATE UNIQUE INDEX "Payment_idempotencyKey_key" ON "Payment"("idempotencyKey");

-- CreateIndex
CREATE INDEX "Payment_hostOrganization_idx" ON "Payment"("hostOrganization");

-- CreateIndex
CREATE INDEX "Payment_guest_idx" ON "Payment"("guest");

-- CreateIndex
CREATE INDEX "PaymentProvider_hostOrganization_idx" ON "PaymentProvider"("hostOrganization");

-- CreateIndex
CREATE INDEX "PaymentProvider_code_idx" ON "PaymentProvider"("code");

-- CreateIndex
CREATE UNIQUE INDEX "PaymentProvider_hostOrganization_code_key" ON "PaymentProvider"("hostOrganization", "code");

-- AddForeignKey
ALTER TABLE "HostMembership" ADD CONSTRAINT "HostMembership_hostOrganization_fkey" FOREIGN KEY ("hostOrganization") REFERENCES "HostOrganization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HostMembership" ADD CONSTRAINT "HostMembership_user_fkey" FOREIGN KEY ("user") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Property" ADD CONSTRAINT "Property_hostOrganization_fkey" FOREIGN KEY ("hostOrganization") REFERENCES "HostOrganization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Property" ADD CONSTRAINT "Property_address_fkey" FOREIGN KEY ("address") REFERENCES "PropertyAddress"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PropertyAddress" ADD CONSTRAINT "PropertyAddress_hostOrganization_fkey" FOREIGN KEY ("hostOrganization") REFERENCES "HostOrganization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccommodationUnit" ADD CONSTRAINT "AccommodationUnit_hostOrganization_fkey" FOREIGN KEY ("hostOrganization") REFERENCES "HostOrganization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccommodationUnit" ADD CONSTRAINT "AccommodationUnit_property_fkey" FOREIGN KEY ("property") REFERENCES "Property"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Bedroom" ADD CONSTRAINT "Bedroom_hostOrganization_fkey" FOREIGN KEY ("hostOrganization") REFERENCES "HostOrganization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Bedroom" ADD CONSTRAINT "Bedroom_accommodationUnit_fkey" FOREIGN KEY ("accommodationUnit") REFERENCES "AccommodationUnit"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Bed" ADD CONSTRAINT "Bed_hostOrganization_fkey" FOREIGN KEY ("hostOrganization") REFERENCES "HostOrganization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Bed" ADD CONSTRAINT "Bed_bedroom_fkey" FOREIGN KEY ("bedroom") REFERENCES "Bedroom"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Listing" ADD CONSTRAINT "Listing_hostOrganization_fkey" FOREIGN KEY ("hostOrganization") REFERENCES "HostOrganization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Listing" ADD CONSTRAINT "Listing_property_fkey" FOREIGN KEY ("property") REFERENCES "Property"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Listing" ADD CONSTRAINT "Listing_accommodationUnit_fkey" FOREIGN KEY ("accommodationUnit") REFERENCES "AccommodationUnit"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ListingMedia" ADD CONSTRAINT "ListingMedia_hostOrganization_fkey" FOREIGN KEY ("hostOrganization") REFERENCES "HostOrganization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ListingMedia" ADD CONSTRAINT "ListingMedia_listing_fkey" FOREIGN KEY ("listing") REFERENCES "Listing"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HouseRule" ADD CONSTRAINT "HouseRule_hostOrganization_fkey" FOREIGN KEY ("hostOrganization") REFERENCES "HostOrganization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HouseRule" ADD CONSTRAINT "HouseRule_listing_fkey" FOREIGN KEY ("listing") REFERENCES "Listing"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CalendarBlock" ADD CONSTRAINT "CalendarBlock_hostOrganization_fkey" FOREIGN KEY ("hostOrganization") REFERENCES "HostOrganization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CalendarBlock" ADD CONSTRAINT "CalendarBlock_listing_fkey" FOREIGN KEY ("listing") REFERENCES "Listing"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CalendarBlock" ADD CONSTRAINT "CalendarBlock_reservation_fkey" FOREIGN KEY ("reservation") REFERENCES "Reservation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CalendarBlock" ADD CONSTRAINT "CalendarBlock_channelReservation_fkey" FOREIGN KEY ("channelReservation") REFERENCES "ChannelReservation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RatePlan" ADD CONSTRAINT "RatePlan_hostOrganization_fkey" FOREIGN KEY ("hostOrganization") REFERENCES "HostOrganization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RatePlan" ADD CONSTRAINT "RatePlan_listing_fkey" FOREIGN KEY ("listing") REFERENCES "Listing"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RatePlan" ADD CONSTRAINT "RatePlan_cancellationPolicy_fkey" FOREIGN KEY ("cancellationPolicy") REFERENCES "CancellationPolicy"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SeasonalRate" ADD CONSTRAINT "SeasonalRate_hostOrganization_fkey" FOREIGN KEY ("hostOrganization") REFERENCES "HostOrganization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SeasonalRate" ADD CONSTRAINT "SeasonalRate_ratePlan_fkey" FOREIGN KEY ("ratePlan") REFERENCES "RatePlan"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FeeDefinition" ADD CONSTRAINT "FeeDefinition_hostOrganization_fkey" FOREIGN KEY ("hostOrganization") REFERENCES "HostOrganization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FeeDefinition" ADD CONSTRAINT "FeeDefinition_listing_fkey" FOREIGN KEY ("listing") REFERENCES "Listing"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaxRule" ADD CONSTRAINT "TaxRule_hostOrganization_fkey" FOREIGN KEY ("hostOrganization") REFERENCES "HostOrganization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaxRule" ADD CONSTRAINT "TaxRule_listing_fkey" FOREIGN KEY ("listing") REFERENCES "Listing"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CancellationPolicy" ADD CONSTRAINT "CancellationPolicy_hostOrganization_fkey" FOREIGN KEY ("hostOrganization") REFERENCES "HostOrganization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StayQuote" ADD CONSTRAINT "StayQuote_hostOrganization_fkey" FOREIGN KEY ("hostOrganization") REFERENCES "HostOrganization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StayQuote" ADD CONSTRAINT "StayQuote_listing_fkey" FOREIGN KEY ("listing") REFERENCES "Listing"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StayQuote" ADD CONSTRAINT "StayQuote_ratePlan_fkey" FOREIGN KEY ("ratePlan") REFERENCES "RatePlan"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GuestProfile" ADD CONSTRAINT "GuestProfile_hostOrganization_fkey" FOREIGN KEY ("hostOrganization") REFERENCES "HostOrganization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GuestProfile" ADD CONSTRAINT "GuestProfile_user_fkey" FOREIGN KEY ("user") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GuestParty" ADD CONSTRAINT "GuestParty_hostOrganization_fkey" FOREIGN KEY ("hostOrganization") REFERENCES "HostOrganization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GuestParty" ADD CONSTRAINT "GuestParty_reservation_fkey" FOREIGN KEY ("reservation") REFERENCES "Reservation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GuestParty" ADD CONSTRAINT "GuestParty_primaryGuest_fkey" FOREIGN KEY ("primaryGuest") REFERENCES "GuestProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reservation" ADD CONSTRAINT "Reservation_hostOrganization_fkey" FOREIGN KEY ("hostOrganization") REFERENCES "HostOrganization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reservation" ADD CONSTRAINT "Reservation_listing_fkey" FOREIGN KEY ("listing") REFERENCES "Listing"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reservation" ADD CONSTRAINT "Reservation_accommodationUnit_fkey" FOREIGN KEY ("accommodationUnit") REFERENCES "AccommodationUnit"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reservation" ADD CONSTRAINT "Reservation_guest_fkey" FOREIGN KEY ("guest") REFERENCES "GuestProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reservation" ADD CONSTRAINT "Reservation_quote_fkey" FOREIGN KEY ("quote") REFERENCES "StayQuote"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reservation" ADD CONSTRAINT "Reservation_agreement_fkey" FOREIGN KEY ("agreement") REFERENCES "StayAgreement"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reservation" ADD CONSTRAINT "Reservation_securityDeposit_fkey" FOREIGN KEY ("securityDeposit") REFERENCES "SecurityDeposit"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReservationLineItem" ADD CONSTRAINT "ReservationLineItem_hostOrganization_fkey" FOREIGN KEY ("hostOrganization") REFERENCES "HostOrganization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReservationLineItem" ADD CONSTRAINT "ReservationLineItem_reservation_fkey" FOREIGN KEY ("reservation") REFERENCES "Reservation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StayAgreement" ADD CONSTRAINT "StayAgreement_hostOrganization_fkey" FOREIGN KEY ("hostOrganization") REFERENCES "HostOrganization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StayAgreement" ADD CONSTRAINT "StayAgreement_guest_fkey" FOREIGN KEY ("guest") REFERENCES "GuestProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StayAgreement" ADD CONSTRAINT "StayAgreement_cancellationPolicy_fkey" FOREIGN KEY ("cancellationPolicy") REFERENCES "CancellationPolicy"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SecurityDeposit" ADD CONSTRAINT "SecurityDeposit_hostOrganization_fkey" FOREIGN KEY ("hostOrganization") REFERENCES "HostOrganization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SecurityDeposit" ADD CONSTRAINT "SecurityDeposit_payment_fkey" FOREIGN KEY ("payment") REFERENCES "Payment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DamageClaim" ADD CONSTRAINT "DamageClaim_hostOrganization_fkey" FOREIGN KEY ("hostOrganization") REFERENCES "HostOrganization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DamageClaim" ADD CONSTRAINT "DamageClaim_reservation_fkey" FOREIGN KEY ("reservation") REFERENCES "Reservation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DamageClaim" ADD CONSTRAINT "DamageClaim_listing_fkey" FOREIGN KEY ("listing") REFERENCES "Listing"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DamageClaim" ADD CONSTRAINT "DamageClaim_guest_fkey" FOREIGN KEY ("guest") REFERENCES "GuestProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_hostOrganization_fkey" FOREIGN KEY ("hostOrganization") REFERENCES "HostOrganization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_reservation_fkey" FOREIGN KEY ("reservation") REFERENCES "Reservation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_guest_fkey" FOREIGN KEY ("guest") REFERENCES "GuestProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentProvider" ADD CONSTRAINT "PaymentProvider_hostOrganization_fkey" FOREIGN KEY ("hostOrganization") REFERENCES "HostOrganization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentWebhookEvent" ADD CONSTRAINT "PaymentWebhookEvent_hostOrganization_fkey" FOREIGN KEY ("hostOrganization") REFERENCES "HostOrganization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentWebhookEvent" ADD CONSTRAINT "PaymentWebhookEvent_paymentProvider_fkey" FOREIGN KEY ("paymentProvider") REFERENCES "PaymentProvider"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentWebhookEvent" ADD CONSTRAINT "PaymentWebhookEvent_payment_fkey" FOREIGN KEY ("payment") REFERENCES "Payment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Refund" ADD CONSTRAINT "Refund_hostOrganization_fkey" FOREIGN KEY ("hostOrganization") REFERENCES "HostOrganization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Refund" ADD CONSTRAINT "Refund_reservation_fkey" FOREIGN KEY ("reservation") REFERENCES "Reservation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Refund" ADD CONSTRAINT "Refund_payment_fkey" FOREIGN KEY ("payment") REFERENCES "Payment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payout" ADD CONSTRAINT "Payout_hostOrganization_fkey" FOREIGN KEY ("hostOrganization") REFERENCES "HostOrganization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payout" ADD CONSTRAINT "Payout_reservation_fkey" FOREIGN KEY ("reservation") REFERENCES "Reservation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Conversation" ADD CONSTRAINT "Conversation_hostOrganization_fkey" FOREIGN KEY ("hostOrganization") REFERENCES "HostOrganization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Conversation" ADD CONSTRAINT "Conversation_reservation_fkey" FOREIGN KEY ("reservation") REFERENCES "Reservation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Conversation" ADD CONSTRAINT "Conversation_listing_fkey" FOREIGN KEY ("listing") REFERENCES "Listing"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Conversation" ADD CONSTRAINT "Conversation_guest_fkey" FOREIGN KEY ("guest") REFERENCES "GuestProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Conversation" ADD CONSTRAINT "Conversation_channelConnection_fkey" FOREIGN KEY ("channelConnection") REFERENCES "ChannelConnection"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_hostOrganization_fkey" FOREIGN KEY ("hostOrganization") REFERENCES "HostOrganization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_conversation_fkey" FOREIGN KEY ("conversation") REFERENCES "Conversation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_senderUser_fkey" FOREIGN KEY ("senderUser") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_hostOrganization_fkey" FOREIGN KEY ("hostOrganization") REFERENCES "HostOrganization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_reservation_fkey" FOREIGN KEY ("reservation") REFERENCES "Reservation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_listing_fkey" FOREIGN KEY ("listing") REFERENCES "Listing"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_guest_fkey" FOREIGN KEY ("guest") REFERENCES "GuestProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_authorUser_fkey" FOREIGN KEY ("authorUser") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PropertyTask" ADD CONSTRAINT "PropertyTask_hostOrganization_fkey" FOREIGN KEY ("hostOrganization") REFERENCES "HostOrganization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PropertyTask" ADD CONSTRAINT "PropertyTask_property_fkey" FOREIGN KEY ("property") REFERENCES "Property"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PropertyTask" ADD CONSTRAINT "PropertyTask_listing_fkey" FOREIGN KEY ("listing") REFERENCES "Listing"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PropertyTask" ADD CONSTRAINT "PropertyTask_reservation_fkey" FOREIGN KEY ("reservation") REFERENCES "Reservation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PropertyTask" ADD CONSTRAINT "PropertyTask_assignee_fkey" FOREIGN KEY ("assignee") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChannelConnection" ADD CONSTRAINT "ChannelConnection_hostOrganization_fkey" FOREIGN KEY ("hostOrganization") REFERENCES "HostOrganization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChannelListing" ADD CONSTRAINT "ChannelListing_hostOrganization_fkey" FOREIGN KEY ("hostOrganization") REFERENCES "HostOrganization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChannelListing" ADD CONSTRAINT "ChannelListing_listing_fkey" FOREIGN KEY ("listing") REFERENCES "Listing"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChannelListing" ADD CONSTRAINT "ChannelListing_channelConnection_fkey" FOREIGN KEY ("channelConnection") REFERENCES "ChannelConnection"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChannelReservation" ADD CONSTRAINT "ChannelReservation_hostOrganization_fkey" FOREIGN KEY ("hostOrganization") REFERENCES "HostOrganization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChannelReservation" ADD CONSTRAINT "ChannelReservation_channelConnection_fkey" FOREIGN KEY ("channelConnection") REFERENCES "ChannelConnection"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChannelReservation" ADD CONSTRAINT "ChannelReservation_channelListing_fkey" FOREIGN KEY ("channelListing") REFERENCES "ChannelListing"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChannelReservation" ADD CONSTRAINT "ChannelReservation_reservation_fkey" FOREIGN KEY ("reservation") REFERENCES "Reservation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChannelSyncEvent" ADD CONSTRAINT "ChannelSyncEvent_hostOrganization_fkey" FOREIGN KEY ("hostOrganization") REFERENCES "HostOrganization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChannelSyncEvent" ADD CONSTRAINT "ChannelSyncEvent_channelConnection_fkey" FOREIGN KEY ("channelConnection") REFERENCES "ChannelConnection"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChannelSyncEvent" ADD CONSTRAINT "ChannelSyncEvent_channelListing_fkey" FOREIGN KEY ("channelListing") REFERENCES "ChannelListing"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChannelSyncEvent" ADD CONSTRAINT "ChannelSyncEvent_channelReservation_fkey" FOREIGN KEY ("channelReservation") REFERENCES "ChannelReservation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_Amenity_listings" ADD CONSTRAINT "_Amenity_listings_A_fkey" FOREIGN KEY ("A") REFERENCES "Amenity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_Amenity_listings" ADD CONSTRAINT "_Amenity_listings_B_fkey" FOREIGN KEY ("B") REFERENCES "Listing"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_Listing_collections" ADD CONSTRAINT "_Listing_collections_A_fkey" FOREIGN KEY ("A") REFERENCES "Listing"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_Listing_collections" ADD CONSTRAINT "_Listing_collections_B_fkey" FOREIGN KEY ("B") REFERENCES "StayCollection"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Enforce whole-home capacity at the database boundary. Application advisory
-- locks provide a friendly availability re-check; this exclusion constraint is
-- the final authority when concurrent writers race or bypass the application.
CREATE EXTENSION IF NOT EXISTS btree_gist;
CREATE FUNCTION "openfront_stay_date"(value TEXT) RETURNS DATE
LANGUAGE SQL IMMUTABLE STRICT PARALLEL SAFE
AS $$
  SELECT make_date(
    substring(value from 1 for 4)::integer,
    substring(value from 6 for 2)::integer,
    substring(value from 9 for 2)::integer
  )
$$;
ALTER TABLE "CalendarBlock"
ADD CONSTRAINT "CalendarBlock_active_listing_range_excl"
EXCLUDE USING gist (
  "listing" WITH =,
  daterange("openfront_stay_date"("startDate"), "openfront_stay_date"("endDate"), '[)') WITH &&
)
WHERE ("status" = 'active' AND "listing" IS NOT NULL);
