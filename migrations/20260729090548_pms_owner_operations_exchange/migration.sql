/*
  Warnings:

  - You are about to drop the column `credentials` on the `ChannelConnection` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[idempotencyKey]` on the table `PropertyTask` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[idempotencyKey]` on the table `Refund` will be added. If there are existing duplicate values, this will fail.

*/
-- Refuse to discard operator-managed provider material. This release removes
-- only the legacy empty placeholder; real provider secrets require an explicit
-- provider-specific, environment-managed migration.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM "ChannelConnection"
    WHERE "credentials" IS NOT NULL AND "credentials" <> '{}'::jsonb
  ) THEN
    RAISE EXCEPTION 'ChannelConnection.credentials contains data; migrate provider secrets explicitly before applying this migration.';
  END IF;
END $$;

-- AlterTable
ALTER TABLE "ChannelConnection" DROP COLUMN "credentials",
ALTER COLUMN "syncReservations" SET DEFAULT false;

-- AlterTable
ALTER TABLE "Payout" ADD COLUMN     "ownerStatement" TEXT,
ADD COLUMN     "propertyOwner" TEXT;

-- AlterTable
ALTER TABLE "PropertyTask" ADD COLUMN     "cancelledAt" TIMESTAMP(3),
ADD COLUMN     "claimedAt" TIMESTAMP(3),
ADD COLUMN     "completionEvidence" JSONB,
ADD COLUMN     "completionNotes" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "idempotencyKey" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "source" TEXT DEFAULT 'manual',
ADD COLUMN     "startedAt" TIMESTAMP(3),
ADD COLUMN     "taskRule" TEXT;

-- Existing operational evidence predates idempotency fields. Backfill stable,
-- unique values before adding unique indexes; new writes are domain-only.
UPDATE "PropertyTask"
SET "idempotencyKey" = 'legacy-property-task:' || md5("id")
WHERE "idempotencyKey" = '';

-- AlterTable
ALTER TABLE "Refund" ADD COLUMN     "idempotencyKey" TEXT NOT NULL DEFAULT '';

UPDATE "Refund"
SET "idempotencyKey" = 'legacy-refund:' || md5("id")
WHERE "idempotencyKey" = '';

-- CreateTable
CREATE TABLE "PropertyOwner" (
    "id" TEXT NOT NULL,
    "hostOrganization" TEXT,
    "user" TEXT,
    "ownerNumber" TEXT NOT NULL DEFAULT '',
    "displayName" TEXT NOT NULL DEFAULT '',
    "companyName" TEXT NOT NULL DEFAULT '',
    "email" TEXT NOT NULL DEFAULT '',
    "phone" TEXT NOT NULL DEFAULT '',
    "status" TEXT DEFAULT 'invited',
    "payoutSchedule" TEXT DEFAULT 'monthly',
    "defaultManagerCommissionBasisPoints" INTEGER DEFAULT 1500,
    "payoutMethod" TEXT DEFAULT 'manual',
    "payoutReference" TEXT NOT NULL DEFAULT '',
    "taxProfile" JSONB DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PropertyOwner_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PropertyOwnerAssignment" (
    "id" TEXT NOT NULL,
    "hostOrganization" TEXT,
    "owner" TEXT,
    "property" TEXT,
    "status" TEXT DEFAULT 'active',
    "isPrimary" BOOLEAN NOT NULL DEFAULT true,
    "ownershipBasisPoints" INTEGER DEFAULT 10000,
    "managerCommissionBasisPoints" INTEGER DEFAULT 1500,
    "effectiveFrom" TEXT NOT NULL DEFAULT '',
    "effectiveTo" TEXT NOT NULL DEFAULT '',
    "notes" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PropertyOwnerAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OwnerStatement" (
    "id" TEXT NOT NULL,
    "hostOrganization" TEXT,
    "owner" TEXT,
    "statementNumber" TEXT NOT NULL DEFAULT '',
    "idempotencyKey" TEXT NOT NULL DEFAULT '',
    "status" TEXT DEFAULT 'draft',
    "periodStart" TEXT NOT NULL DEFAULT '',
    "periodEnd" TEXT NOT NULL DEFAULT '',
    "currencyCode" TEXT NOT NULL DEFAULT 'USD',
    "grossRevenueCents" INTEGER DEFAULT 0,
    "taxAmountCents" INTEGER DEFAULT 0,
    "refundAmountCents" INTEGER DEFAULT 0,
    "expenseAmountCents" INTEGER DEFAULT 0,
    "adjustmentAmountCents" INTEGER DEFAULT 0,
    "managerCommissionCents" INTEGER DEFAULT 0,
    "ownerEarningsCents" INTEGER DEFAULT 0,
    "paidOutCents" INTEGER DEFAULT 0,
    "balanceDueCents" INTEGER DEFAULT 0,
    "statementSnapshot" JSONB,
    "generatedAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "approvedAt" TIMESTAMP(3),
    "sentAt" TIMESTAMP(3),
    "paidAt" TIMESTAMP(3),
    "paidReference" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OwnerStatement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OwnerStatementLine" (
    "id" TEXT NOT NULL,
    "hostOrganization" TEXT,
    "statement" TEXT,
    "owner" TEXT,
    "reservation" TEXT,
    "refund" TEXT,
    "payout" TEXT,
    "lineKey" TEXT NOT NULL DEFAULT '',
    "lineType" TEXT DEFAULT 'reservation_revenue',
    "description" TEXT NOT NULL DEFAULT '',
    "serviceDate" TEXT NOT NULL DEFAULT '',
    "amountCents" INTEGER NOT NULL,
    "sourceId" TEXT NOT NULL DEFAULT '',
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OwnerStatementLine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TaskRule" (
    "id" TEXT NOT NULL,
    "hostOrganization" TEXT,
    "property" TEXT,
    "listing" TEXT,
    "defaultAssignee" TEXT,
    "code" TEXT NOT NULL DEFAULT '',
    "name" TEXT NOT NULL DEFAULT '',
    "trigger" TEXT DEFAULT 'after_check_out',
    "offsetMinutes" INTEGER DEFAULT 0,
    "taskType" TEXT DEFAULT 'turnover_cleaning',
    "titleTemplate" TEXT NOT NULL DEFAULT '',
    "priority" TEXT DEFAULT 'normal',
    "checklistTemplate" JSONB DEFAULT '[]',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TaskRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DataExchangeJob" (
    "id" TEXT NOT NULL,
    "hostOrganization" TEXT,
    "channelConnection" TEXT,
    "listing" TEXT,
    "direction" TEXT DEFAULT 'import',
    "domain" TEXT DEFAULT 'availability',
    "format" TEXT DEFAULT 'json',
    "status" TEXT DEFAULT 'pending',
    "idempotencyKey" TEXT NOT NULL DEFAULT '',
    "payloadSha256" TEXT NOT NULL DEFAULT '',
    "sourceLabel" TEXT NOT NULL DEFAULT '',
    "processedCount" INTEGER DEFAULT 0,
    "createdCount" INTEGER DEFAULT 0,
    "updatedCount" INTEGER DEFAULT 0,
    "skippedCount" INTEGER DEFAULT 0,
    "conflictCount" INTEGER DEFAULT 0,
    "resultSummary" JSONB,
    "errorMessage" TEXT NOT NULL DEFAULT '',
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DataExchangeJob_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OutboxEvent" (
    "id" TEXT NOT NULL,
    "hostOrganization" TEXT,
    "eventType" TEXT NOT NULL DEFAULT '',
    "aggregateType" TEXT NOT NULL DEFAULT '',
    "aggregateId" TEXT NOT NULL DEFAULT '',
    "idempotencyKey" TEXT NOT NULL DEFAULT '',
    "payload" JSONB,
    "status" TEXT DEFAULT 'pending',
    "attempts" INTEGER DEFAULT 0,
    "availableAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "processedAt" TIMESTAMP(3),
    "lastError" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OutboxEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PropertyOwner_ownerNumber_key" ON "PropertyOwner"("ownerNumber");

-- CreateIndex
CREATE INDEX "PropertyOwner_hostOrganization_idx" ON "PropertyOwner"("hostOrganization");

-- CreateIndex
CREATE INDEX "PropertyOwner_user_idx" ON "PropertyOwner"("user");

-- CreateIndex
CREATE INDEX "PropertyOwnerAssignment_hostOrganization_idx" ON "PropertyOwnerAssignment"("hostOrganization");

-- CreateIndex
CREATE INDEX "PropertyOwnerAssignment_owner_idx" ON "PropertyOwnerAssignment"("owner");

-- CreateIndex
CREATE INDEX "PropertyOwnerAssignment_property_idx" ON "PropertyOwnerAssignment"("property");

-- CreateIndex
CREATE UNIQUE INDEX "PropertyOwnerAssignment_property_owner_effectiveFrom_key" ON "PropertyOwnerAssignment"("property", "owner", "effectiveFrom");

-- CreateIndex
CREATE UNIQUE INDEX "OwnerStatement_statementNumber_key" ON "OwnerStatement"("statementNumber");

-- CreateIndex
CREATE UNIQUE INDEX "OwnerStatement_idempotencyKey_key" ON "OwnerStatement"("idempotencyKey");

-- CreateIndex
CREATE INDEX "OwnerStatement_hostOrganization_idx" ON "OwnerStatement"("hostOrganization");

-- CreateIndex
CREATE INDEX "OwnerStatement_owner_idx" ON "OwnerStatement"("owner");

-- CreateIndex
CREATE UNIQUE INDEX "OwnerStatementLine_lineKey_key" ON "OwnerStatementLine"("lineKey");

-- CreateIndex
CREATE INDEX "OwnerStatementLine_hostOrganization_idx" ON "OwnerStatementLine"("hostOrganization");

-- CreateIndex
CREATE INDEX "OwnerStatementLine_statement_idx" ON "OwnerStatementLine"("statement");

-- CreateIndex
CREATE INDEX "OwnerStatementLine_owner_idx" ON "OwnerStatementLine"("owner");

-- CreateIndex
CREATE INDEX "OwnerStatementLine_reservation_idx" ON "OwnerStatementLine"("reservation");

-- CreateIndex
CREATE INDEX "OwnerStatementLine_refund_idx" ON "OwnerStatementLine"("refund");

-- CreateIndex
CREATE INDEX "OwnerStatementLine_payout_idx" ON "OwnerStatementLine"("payout");

-- CreateIndex
CREATE UNIQUE INDEX "TaskRule_code_key" ON "TaskRule"("code");

-- CreateIndex
CREATE INDEX "TaskRule_hostOrganization_idx" ON "TaskRule"("hostOrganization");

-- CreateIndex
CREATE INDEX "TaskRule_property_idx" ON "TaskRule"("property");

-- CreateIndex
CREATE INDEX "TaskRule_listing_idx" ON "TaskRule"("listing");

-- CreateIndex
CREATE INDEX "TaskRule_defaultAssignee_idx" ON "TaskRule"("defaultAssignee");

-- CreateIndex
CREATE UNIQUE INDEX "DataExchangeJob_idempotencyKey_key" ON "DataExchangeJob"("idempotencyKey");

-- CreateIndex
CREATE INDEX "DataExchangeJob_hostOrganization_idx" ON "DataExchangeJob"("hostOrganization");

-- CreateIndex
CREATE INDEX "DataExchangeJob_channelConnection_idx" ON "DataExchangeJob"("channelConnection");

-- CreateIndex
CREATE INDEX "DataExchangeJob_listing_idx" ON "DataExchangeJob"("listing");

-- CreateIndex
CREATE UNIQUE INDEX "OutboxEvent_idempotencyKey_key" ON "OutboxEvent"("idempotencyKey");

-- CreateIndex
CREATE INDEX "OutboxEvent_hostOrganization_idx" ON "OutboxEvent"("hostOrganization");

-- CreateIndex
CREATE INDEX "Payout_propertyOwner_idx" ON "Payout"("propertyOwner");

-- CreateIndex
CREATE INDEX "Payout_ownerStatement_idx" ON "Payout"("ownerStatement");

-- CreateIndex
CREATE UNIQUE INDEX "PropertyTask_idempotencyKey_key" ON "PropertyTask"("idempotencyKey");

-- CreateIndex
CREATE INDEX "PropertyTask_taskRule_idx" ON "PropertyTask"("taskRule");

-- CreateIndex
CREATE UNIQUE INDEX "Refund_idempotencyKey_key" ON "Refund"("idempotencyKey");

-- AddForeignKey
ALTER TABLE "PropertyOwner" ADD CONSTRAINT "PropertyOwner_hostOrganization_fkey" FOREIGN KEY ("hostOrganization") REFERENCES "HostOrganization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PropertyOwner" ADD CONSTRAINT "PropertyOwner_user_fkey" FOREIGN KEY ("user") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PropertyOwnerAssignment" ADD CONSTRAINT "PropertyOwnerAssignment_hostOrganization_fkey" FOREIGN KEY ("hostOrganization") REFERENCES "HostOrganization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PropertyOwnerAssignment" ADD CONSTRAINT "PropertyOwnerAssignment_owner_fkey" FOREIGN KEY ("owner") REFERENCES "PropertyOwner"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PropertyOwnerAssignment" ADD CONSTRAINT "PropertyOwnerAssignment_property_fkey" FOREIGN KEY ("property") REFERENCES "Property"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payout" ADD CONSTRAINT "Payout_propertyOwner_fkey" FOREIGN KEY ("propertyOwner") REFERENCES "PropertyOwner"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payout" ADD CONSTRAINT "Payout_ownerStatement_fkey" FOREIGN KEY ("ownerStatement") REFERENCES "OwnerStatement"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OwnerStatement" ADD CONSTRAINT "OwnerStatement_hostOrganization_fkey" FOREIGN KEY ("hostOrganization") REFERENCES "HostOrganization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OwnerStatement" ADD CONSTRAINT "OwnerStatement_owner_fkey" FOREIGN KEY ("owner") REFERENCES "PropertyOwner"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OwnerStatementLine" ADD CONSTRAINT "OwnerStatementLine_hostOrganization_fkey" FOREIGN KEY ("hostOrganization") REFERENCES "HostOrganization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OwnerStatementLine" ADD CONSTRAINT "OwnerStatementLine_statement_fkey" FOREIGN KEY ("statement") REFERENCES "OwnerStatement"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OwnerStatementLine" ADD CONSTRAINT "OwnerStatementLine_owner_fkey" FOREIGN KEY ("owner") REFERENCES "PropertyOwner"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OwnerStatementLine" ADD CONSTRAINT "OwnerStatementLine_reservation_fkey" FOREIGN KEY ("reservation") REFERENCES "Reservation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OwnerStatementLine" ADD CONSTRAINT "OwnerStatementLine_refund_fkey" FOREIGN KEY ("refund") REFERENCES "Refund"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OwnerStatementLine" ADD CONSTRAINT "OwnerStatementLine_payout_fkey" FOREIGN KEY ("payout") REFERENCES "Payout"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskRule" ADD CONSTRAINT "TaskRule_hostOrganization_fkey" FOREIGN KEY ("hostOrganization") REFERENCES "HostOrganization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskRule" ADD CONSTRAINT "TaskRule_property_fkey" FOREIGN KEY ("property") REFERENCES "Property"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskRule" ADD CONSTRAINT "TaskRule_listing_fkey" FOREIGN KEY ("listing") REFERENCES "Listing"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskRule" ADD CONSTRAINT "TaskRule_defaultAssignee_fkey" FOREIGN KEY ("defaultAssignee") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PropertyTask" ADD CONSTRAINT "PropertyTask_taskRule_fkey" FOREIGN KEY ("taskRule") REFERENCES "TaskRule"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DataExchangeJob" ADD CONSTRAINT "DataExchangeJob_hostOrganization_fkey" FOREIGN KEY ("hostOrganization") REFERENCES "HostOrganization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DataExchangeJob" ADD CONSTRAINT "DataExchangeJob_channelConnection_fkey" FOREIGN KEY ("channelConnection") REFERENCES "ChannelConnection"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DataExchangeJob" ADD CONSTRAINT "DataExchangeJob_listing_fkey" FOREIGN KEY ("listing") REFERENCES "Listing"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OutboxEvent" ADD CONSTRAINT "OutboxEvent_hostOrganization_fkey" FOREIGN KEY ("hostOrganization") REFERENCES "HostOrganization"("id") ON DELETE SET NULL ON UPDATE CASCADE;
