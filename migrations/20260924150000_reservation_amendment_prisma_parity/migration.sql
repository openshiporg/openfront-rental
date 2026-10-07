ALTER TABLE "ReservationAmendment"
  ALTER COLUMN "hostOrganization" DROP NOT NULL,
  ALTER COLUMN "reservation" DROP NOT NULL,
  ALTER COLUMN "idempotencyKey" SET DEFAULT '',
  ALTER COLUMN "requestHash" SET DEFAULT '',
  ALTER COLUMN "actorUserId" SET DEFAULT '',
  ALTER COLUMN "reason" SET DEFAULT '',
  ALTER COLUMN "previousCheckInDate" SET DEFAULT '',
  ALTER COLUMN "previousCheckOutDate" SET DEFAULT '',
  ALTER COLUMN "checkInDate" SET DEFAULT '',
  ALTER COLUMN "checkOutDate" SET DEFAULT '',
  ALTER COLUMN "currencyCode" SET DEFAULT '',
  ALTER COLUMN "originalBookingSnapshotHash" SET DEFAULT '',
  ALTER COLUMN "beforeSnapshot" DROP NOT NULL,
  ALTER COLUMN "afterSnapshot" DROP NOT NULL,
  ALTER COLUMN "delta" DROP NOT NULL;

ALTER TABLE "ReservationAmendment"
  DROP CONSTRAINT "ReservationAmendment_hostOrganization_fkey",
  DROP CONSTRAINT "ReservationAmendment_reservation_fkey";

ALTER TABLE "ReservationAmendment"
  ADD CONSTRAINT "ReservationAmendment_hostOrganization_fkey"
    FOREIGN KEY ("hostOrganization") REFERENCES "HostOrganization"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT "ReservationAmendment_reservation_fkey"
    FOREIGN KEY ("reservation") REFERENCES "Reservation"("id") ON DELETE SET NULL ON UPDATE CASCADE;
