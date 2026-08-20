-- CreateTable
CREATE TABLE "RentalAsset" (
    "id" TEXT NOT NULL,
    "assetTag" TEXT NOT NULL DEFAULT '',
    "item" TEXT,
    "location" TEXT,
    "assetStatus" TEXT DEFAULT 'available',
    "serialNumber" TEXT NOT NULL DEFAULT '',
    "acquiredAt" TIMESTAMP(3),
    "purchaseCostCents" INTEGER DEFAULT 0,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RentalAsset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AvailabilityCalendar" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL DEFAULT '',
    "item" TEXT,
    "location" TEXT,
    "calendarType" TEXT DEFAULT 'inventory',
    "timezone" TEXT NOT NULL DEFAULT 'America/New_York',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AvailabilityCalendar_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RentalContract" (
    "id" TEXT NOT NULL,
    "contractNumber" TEXT NOT NULL DEFAULT '',
    "reservation" TEXT,
    "customer" TEXT,
    "agreement" TEXT,
    "status" TEXT DEFAULT 'draft',
    "documentUrl" TEXT NOT NULL DEFAULT '',
    "termsSnapshot" TEXT NOT NULL DEFAULT '',
    "sentAt" TIMESTAMP(3),
    "signedAt" TIMESTAMP(3),
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RentalContract_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LateFee" (
    "id" TEXT NOT NULL,
    "feeNumber" TEXT NOT NULL DEFAULT '',
    "reservation" TEXT,
    "customer" TEXT,
    "status" TEXT DEFAULT 'pending',
    "amountCents" INTEGER DEFAULT 0,
    "daysLate" INTEGER DEFAULT 0,
    "reason" TEXT NOT NULL DEFAULT '',
    "assessedAt" TIMESTAMP(3),
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LateFee_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DeliveryTask" (
    "id" TEXT NOT NULL,
    "taskNumber" TEXT NOT NULL DEFAULT '',
    "reservation" TEXT,
    "item" TEXT,
    "status" TEXT DEFAULT 'queued',
    "driver" TEXT,
    "pickupAddress" TEXT NOT NULL DEFAULT '',
    "deliveryAddress" TEXT NOT NULL DEFAULT '',
    "scheduledAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "deliveryFeeCents" INTEGER DEFAULT 0,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DeliveryTask_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PickupReturn" (
    "id" TEXT NOT NULL,
    "handoffNumber" TEXT NOT NULL DEFAULT '',
    "reservation" TEXT,
    "item" TEXT,
    "customer" TEXT,
    "handoffType" TEXT DEFAULT 'pickup',
    "status" TEXT DEFAULT 'scheduled',
    "scheduledAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "location" TEXT,
    "signedByName" TEXT NOT NULL DEFAULT '',
    "notes" TEXT NOT NULL DEFAULT '',
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PickupReturn_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MaintenanceTicket" (
    "id" TEXT NOT NULL,
    "ticketNumber" TEXT NOT NULL DEFAULT '',
    "item" TEXT,
    "damageReport" TEXT,
    "status" TEXT DEFAULT 'open',
    "priority" TEXT DEFAULT 'normal',
    "summary" TEXT NOT NULL DEFAULT '',
    "vendorName" TEXT NOT NULL DEFAULT '',
    "estimatedCostCents" INTEGER DEFAULT 0,
    "scheduledAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MaintenanceTicket_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DamageReport" (
    "id" TEXT NOT NULL,
    "reportNumber" TEXT NOT NULL DEFAULT '',
    "item" TEXT,
    "reservation" TEXT,
    "inspection" TEXT,
    "severity" TEXT DEFAULT 'minor',
    "status" TEXT DEFAULT 'open',
    "description" TEXT NOT NULL DEFAULT '',
    "estimatedRepairCents" INTEGER DEFAULT 0,
    "photoUrls" JSONB,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DamageReport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Inspection" (
    "id" TEXT NOT NULL,
    "inspectionNumber" TEXT NOT NULL DEFAULT '',
    "item" TEXT,
    "reservation" TEXT,
    "inspectionType" TEXT DEFAULT 'checkout',
    "status" TEXT DEFAULT 'scheduled',
    "inspectedBy" TEXT,
    "inspectedAt" TIMESTAMP(3),
    "conditionSummary" TEXT NOT NULL DEFAULT '',
    "odometerReading" INTEGER,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Inspection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InsurancePolicy" (
    "id" TEXT NOT NULL,
    "policyNumber" TEXT NOT NULL DEFAULT '',
    "customer" TEXT,
    "reservation" TEXT,
    "providerName" TEXT NOT NULL DEFAULT '',
    "coverageType" TEXT DEFAULT 'damage_waiver',
    "status" TEXT DEFAULT 'quoted',
    "premiumCents" INTEGER DEFAULT 0,
    "startsAt" TIMESTAMP(3),
    "endsAt" TIMESTAMP(3),
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InsurancePolicy_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Deposit" (
    "id" TEXT NOT NULL,
    "depositNumber" TEXT NOT NULL DEFAULT '',
    "reservation" TEXT,
    "customer" TEXT,
    "status" TEXT DEFAULT 'pending',
    "amountCents" INTEGER DEFAULT 0,
    "currencyCode" TEXT NOT NULL DEFAULT 'USD',
    "heldAt" TIMESTAMP(3),
    "releasedAt" TIMESTAMP(3),
    "notes" TEXT NOT NULL DEFAULT '',
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Deposit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PricingRule" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL DEFAULT '',
    "item" TEXT,
    "category" TEXT,
    "ruleType" TEXT DEFAULT 'seasonal',
    "adjustmentType" TEXT DEFAULT 'percent',
    "adjustmentValue" INTEGER DEFAULT 0,
    "startsAt" TIMESTAMP(3),
    "endsAt" TIMESTAMP(3),
    "active" BOOLEAN NOT NULL DEFAULT true,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PricingRule_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "RentalAsset_assetTag_key" ON "RentalAsset"("assetTag");

-- CreateIndex
CREATE INDEX "RentalAsset_item_idx" ON "RentalAsset"("item");

-- CreateIndex
CREATE INDEX "RentalAsset_location_idx" ON "RentalAsset"("location");

-- CreateIndex
CREATE INDEX "AvailabilityCalendar_item_idx" ON "AvailabilityCalendar"("item");

-- CreateIndex
CREATE INDEX "AvailabilityCalendar_location_idx" ON "AvailabilityCalendar"("location");

-- CreateIndex
CREATE UNIQUE INDEX "RentalContract_contractNumber_key" ON "RentalContract"("contractNumber");

-- CreateIndex
CREATE INDEX "RentalContract_reservation_idx" ON "RentalContract"("reservation");

-- CreateIndex
CREATE INDEX "RentalContract_customer_idx" ON "RentalContract"("customer");

-- CreateIndex
CREATE INDEX "RentalContract_agreement_idx" ON "RentalContract"("agreement");

-- CreateIndex
CREATE UNIQUE INDEX "LateFee_feeNumber_key" ON "LateFee"("feeNumber");

-- CreateIndex
CREATE INDEX "LateFee_reservation_idx" ON "LateFee"("reservation");

-- CreateIndex
CREATE INDEX "LateFee_customer_idx" ON "LateFee"("customer");

-- CreateIndex
CREATE UNIQUE INDEX "DeliveryTask_taskNumber_key" ON "DeliveryTask"("taskNumber");

-- CreateIndex
CREATE INDEX "DeliveryTask_reservation_idx" ON "DeliveryTask"("reservation");

-- CreateIndex
CREATE INDEX "DeliveryTask_item_idx" ON "DeliveryTask"("item");

-- CreateIndex
CREATE INDEX "DeliveryTask_driver_idx" ON "DeliveryTask"("driver");

-- CreateIndex
CREATE UNIQUE INDEX "PickupReturn_handoffNumber_key" ON "PickupReturn"("handoffNumber");

-- CreateIndex
CREATE INDEX "PickupReturn_reservation_idx" ON "PickupReturn"("reservation");

-- CreateIndex
CREATE INDEX "PickupReturn_item_idx" ON "PickupReturn"("item");

-- CreateIndex
CREATE INDEX "PickupReturn_customer_idx" ON "PickupReturn"("customer");

-- CreateIndex
CREATE INDEX "PickupReturn_location_idx" ON "PickupReturn"("location");

-- CreateIndex
CREATE UNIQUE INDEX "MaintenanceTicket_ticketNumber_key" ON "MaintenanceTicket"("ticketNumber");

-- CreateIndex
CREATE INDEX "MaintenanceTicket_item_idx" ON "MaintenanceTicket"("item");

-- CreateIndex
CREATE INDEX "MaintenanceTicket_damageReport_idx" ON "MaintenanceTicket"("damageReport");

-- CreateIndex
CREATE UNIQUE INDEX "DamageReport_reportNumber_key" ON "DamageReport"("reportNumber");

-- CreateIndex
CREATE INDEX "DamageReport_item_idx" ON "DamageReport"("item");

-- CreateIndex
CREATE INDEX "DamageReport_reservation_idx" ON "DamageReport"("reservation");

-- CreateIndex
CREATE INDEX "DamageReport_inspection_idx" ON "DamageReport"("inspection");

-- CreateIndex
CREATE UNIQUE INDEX "Inspection_inspectionNumber_key" ON "Inspection"("inspectionNumber");

-- CreateIndex
CREATE INDEX "Inspection_item_idx" ON "Inspection"("item");

-- CreateIndex
CREATE INDEX "Inspection_reservation_idx" ON "Inspection"("reservation");

-- CreateIndex
CREATE INDEX "Inspection_inspectedBy_idx" ON "Inspection"("inspectedBy");

-- CreateIndex
CREATE UNIQUE INDEX "InsurancePolicy_policyNumber_key" ON "InsurancePolicy"("policyNumber");

-- CreateIndex
CREATE INDEX "InsurancePolicy_customer_idx" ON "InsurancePolicy"("customer");

-- CreateIndex
CREATE INDEX "InsurancePolicy_reservation_idx" ON "InsurancePolicy"("reservation");

-- CreateIndex
CREATE UNIQUE INDEX "Deposit_depositNumber_key" ON "Deposit"("depositNumber");

-- CreateIndex
CREATE INDEX "Deposit_reservation_idx" ON "Deposit"("reservation");

-- CreateIndex
CREATE INDEX "Deposit_customer_idx" ON "Deposit"("customer");

-- CreateIndex
CREATE INDEX "PricingRule_item_idx" ON "PricingRule"("item");

-- CreateIndex
CREATE INDEX "PricingRule_category_idx" ON "PricingRule"("category");

-- AddForeignKey
ALTER TABLE "RentalAsset" ADD CONSTRAINT "RentalAsset_item_fkey" FOREIGN KEY ("item") REFERENCES "RentalItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RentalAsset" ADD CONSTRAINT "RentalAsset_location_fkey" FOREIGN KEY ("location") REFERENCES "RentalLocation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AvailabilityCalendar" ADD CONSTRAINT "AvailabilityCalendar_item_fkey" FOREIGN KEY ("item") REFERENCES "RentalItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AvailabilityCalendar" ADD CONSTRAINT "AvailabilityCalendar_location_fkey" FOREIGN KEY ("location") REFERENCES "RentalLocation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RentalContract" ADD CONSTRAINT "RentalContract_reservation_fkey" FOREIGN KEY ("reservation") REFERENCES "RentalReservation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RentalContract" ADD CONSTRAINT "RentalContract_customer_fkey" FOREIGN KEY ("customer") REFERENCES "RentalCustomer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RentalContract" ADD CONSTRAINT "RentalContract_agreement_fkey" FOREIGN KEY ("agreement") REFERENCES "RentalAgreement"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LateFee" ADD CONSTRAINT "LateFee_reservation_fkey" FOREIGN KEY ("reservation") REFERENCES "RentalReservation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LateFee" ADD CONSTRAINT "LateFee_customer_fkey" FOREIGN KEY ("customer") REFERENCES "RentalCustomer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeliveryTask" ADD CONSTRAINT "DeliveryTask_reservation_fkey" FOREIGN KEY ("reservation") REFERENCES "RentalReservation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeliveryTask" ADD CONSTRAINT "DeliveryTask_item_fkey" FOREIGN KEY ("item") REFERENCES "RentalItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeliveryTask" ADD CONSTRAINT "DeliveryTask_driver_fkey" FOREIGN KEY ("driver") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PickupReturn" ADD CONSTRAINT "PickupReturn_reservation_fkey" FOREIGN KEY ("reservation") REFERENCES "RentalReservation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PickupReturn" ADD CONSTRAINT "PickupReturn_item_fkey" FOREIGN KEY ("item") REFERENCES "RentalItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PickupReturn" ADD CONSTRAINT "PickupReturn_customer_fkey" FOREIGN KEY ("customer") REFERENCES "RentalCustomer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PickupReturn" ADD CONSTRAINT "PickupReturn_location_fkey" FOREIGN KEY ("location") REFERENCES "RentalLocation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaintenanceTicket" ADD CONSTRAINT "MaintenanceTicket_item_fkey" FOREIGN KEY ("item") REFERENCES "RentalItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaintenanceTicket" ADD CONSTRAINT "MaintenanceTicket_damageReport_fkey" FOREIGN KEY ("damageReport") REFERENCES "DamageReport"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DamageReport" ADD CONSTRAINT "DamageReport_item_fkey" FOREIGN KEY ("item") REFERENCES "RentalItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DamageReport" ADD CONSTRAINT "DamageReport_reservation_fkey" FOREIGN KEY ("reservation") REFERENCES "RentalReservation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DamageReport" ADD CONSTRAINT "DamageReport_inspection_fkey" FOREIGN KEY ("inspection") REFERENCES "Inspection"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Inspection" ADD CONSTRAINT "Inspection_item_fkey" FOREIGN KEY ("item") REFERENCES "RentalItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Inspection" ADD CONSTRAINT "Inspection_reservation_fkey" FOREIGN KEY ("reservation") REFERENCES "RentalReservation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Inspection" ADD CONSTRAINT "Inspection_inspectedBy_fkey" FOREIGN KEY ("inspectedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InsurancePolicy" ADD CONSTRAINT "InsurancePolicy_customer_fkey" FOREIGN KEY ("customer") REFERENCES "RentalCustomer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InsurancePolicy" ADD CONSTRAINT "InsurancePolicy_reservation_fkey" FOREIGN KEY ("reservation") REFERENCES "RentalReservation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Deposit" ADD CONSTRAINT "Deposit_reservation_fkey" FOREIGN KEY ("reservation") REFERENCES "RentalReservation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Deposit" ADD CONSTRAINT "Deposit_customer_fkey" FOREIGN KEY ("customer") REFERENCES "RentalCustomer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PricingRule" ADD CONSTRAINT "PricingRule_item_fkey" FOREIGN KEY ("item") REFERENCES "RentalItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PricingRule" ADD CONSTRAINT "PricingRule_category_fkey" FOREIGN KEY ("category") REFERENCES "RentalCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;
