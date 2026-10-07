CREATE TABLE "ReservationAmendment" (
    "id" TEXT NOT NULL,
    "hostOrganization" TEXT NOT NULL,
    "reservation" TEXT NOT NULL,
    "idempotencyKey" TEXT NOT NULL,
    "requestHash" TEXT NOT NULL,
    "actorUserId" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "previousCheckInDate" TEXT NOT NULL,
    "previousCheckOutDate" TEXT NOT NULL,
    "checkInDate" TEXT NOT NULL,
    "checkOutDate" TEXT NOT NULL,
    "currencyCode" TEXT NOT NULL,
    "originalBookingSnapshotHash" TEXT NOT NULL,
    "beforeSnapshot" JSONB NOT NULL,
    "afterSnapshot" JSONB NOT NULL,
    "delta" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReservationAmendment_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ReservationAmendment_idempotencyKey_key" ON "ReservationAmendment"("idempotencyKey");
CREATE INDEX "ReservationAmendment_hostOrganization_idx" ON "ReservationAmendment"("hostOrganization");
CREATE INDEX "ReservationAmendment_reservation_idx" ON "ReservationAmendment"("reservation");

ALTER TABLE "ReservationAmendment"
  ADD CONSTRAINT "ReservationAmendment_hostOrganization_fkey"
  FOREIGN KEY ("hostOrganization") REFERENCES "HostOrganization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "ReservationAmendment"
  ADD CONSTRAINT "ReservationAmendment_reservation_fkey"
  FOREIGN KEY ("reservation") REFERENCES "Reservation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
